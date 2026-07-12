"""
FHE LLM Batched Low-Rank — NO quality decrease.

Uses SVD at full rank (k=1024, which is lossless for 1024-dim input)
with higher precision (n_bits=6-7, p_error=0.01) to match baseline
quality of 0.96, while batching multiple tokens per FHE call for
massive throughput improvement.

Also tests n_bits=5 with p_error=0.01 to see if that's sufficient.
"""
import os
import sys
import time
import json
import shutil
import subprocess
import asyncio
import concurrent.futures
import re
import numpy as np
from pathlib import Path

import torch
import torch.nn as nn
import concrete.compiler
from huggingface_hub import hf_hub_download
from safetensors.torch import load_file
from concrete.ml.torch.compile import compile_torch_model
from concrete.ml.deployment import FHEModelDev, FHEModelClient, FHEModelServer

from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="FHE Batched No-Quality-Loss Optimizer", version="0.1.0")

# Global subprocess handle for manual trigger
opt_proc = None

MODEL_ID = os.getenv("FHE_MODEL_ID", "LiquidAI/LFM2.5-230M")
OUT_DIR = Path("/app/batched_opt")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def _load_synthetic_qwen_moe(model_id):
    """Generate synthetic weights matching a Qwen3.5/3.6 MoE model layer.

    Avoids downloading hundreds of gigabytes; uses the official config for dimensions.
    """
    from huggingface_hub import hf_hub_download
    config_path = hf_hub_download(model_id, "config.json")
    with open(config_path) as f:
        cfg = json.load(f).get("text_config", {})
    hidden = int(cfg.get("hidden_size", 4096))
    n_heads = int(cfg.get("num_attention_heads", 32))
    n_kv = int(cfg.get("num_key_value_heads", 2))
    head_dim = hidden // n_heads
    moe_int = int(cfg.get("moe_intermediate_size", 1024) or 1024)
    n_exp_per_tok = int(cfg.get("num_experts_per_tok", 8))
    # Build a single composed projection: q, k, v, o, moe_w1, moe_w3
    q = torch.randn(hidden, hidden)
    k = torch.randn(n_kv * head_dim, hidden)
    v = torch.randn(n_kv * head_dim, hidden)
    o = torch.randn(hidden, hidden)
    w1 = torch.randn(n_exp_per_tok * moe_int, hidden)
    w3 = torch.randn(n_exp_per_tok * moe_int, hidden)
    composed = torch.cat([q, k, v, o, w1, w3], dim=0)
    print(f"Synthetic {model_id} layer: {composed.shape[0]} x {composed.shape[1]}", flush=True)
    return {"q": q, "k": k, "v": v, "o": o, "w1": w1, "w3": w3}, cfg


def _detect_worker_index() -> int:
    """Detect worker index from Kubernetes-style hostname or env var.

    Akash deployments with count > 1 create pods named like
    fhe-optimizer-0, fhe-optimizer-1, etc. We use the hostname suffix
    when available, otherwise fall back to FHE_WORKER_INDEX.
    """
    hostname = os.getenv("HOSTNAME", "")
    m = re.search(r"-(\d+)$", hostname)
    if m:
        return int(m.group(1))
    return int(os.getenv("FHE_WORKER_INDEX", "0"))


FHE_WORKER_INDEX = _detect_worker_index()
FHE_WORKER_COUNT = int(os.getenv("FHE_WORKER_COUNT", "1"))
FHE_AUTOSTART = os.getenv("FHE_AUTOSTART", "0").lower() in ("1", "true", "yes")


def _get_worker_configs():
    """Return the subset of CONFIGS assigned to this worker."""
    if FHE_WORKER_COUNT <= 1:
        return CONFIGS
    return [
        cfg
        for idx, cfg in enumerate(CONFIGS)
        if idx % FHE_WORKER_COUNT == FHE_WORKER_INDEX
    ]


# Configs: (rank, n_bits, p_error, batch_size)
# Focus on maintaining quality >= 0.95 while maximizing throughput
_BASE_CONFIGS = [
    # Baseline: full composed, no low-rank, batch=1
    (1024, 5, 0.02, 1, "baseline_full"),

    # Full rank (lossless SVD) batch=1 — highest quality, parallel tested
    (1024, 7, 0.01, 1, "r1024_n7_pe01_b1"),
    (1024, 7, 0.005, 1, "r1024_n7_pe005_b1"),
    (1024, 6, 0.01, 1, "r1024_n6_pe01_b1"),
    (1024, 6, 0.005, 1, "r1024_n6_pe005_b1"),
    (1024, 5, 0.01, 1, "r1024_n5_pe01_b1"),

    # Block-diagonal batched (batch=2 with high rank, batch=4 with lower rank)
    (1024, 7, 0.01, 2, "r1024_n7_pe01_b2"),
    (1024, 6, 0.01, 2, "r1024_n6_pe01_b2"),
    (1024, 7, 0.005, 2, "r1024_n7_pe005_b2"),
    (1024, 6, 0.01, 4, "r1024_n6_pe01_b4"),
    (512, 7, 0.01, 4, "r512_n7_pe01_b4"),
    (512, 6, 0.01, 4, "r512_n6_pe01_b4"),

    # Lower precision for speed comparison
    (1024, 4, 0.01, 1, "r1024_n4_pe01_b1"),
    (1024, 4, 0.01, 2, "r1024_n4_pe01_b2"),
    (512, 4, 0.01, 4, "r512_n4_pe01_b4"),

    # Full composed (no SVD) batch=1 only — too large for block-diag
    (8192, 6, 0.01, 1, "full_n6_b1"),
    (8192, 7, 0.01, 1, "full_n7_b1"),
]

# Minimal config set for large-model scale tests (e.g. Qwen3.5-397B).
# Higher hidden dims need higher ranks; avoid no-SVD/full configs because
# the composed matrix is too large for practical FHE compilation.
_SCALE_TEST_CONFIGS = [
    (512, 4, 0.01, 1, "r512_n4_pe01_b1"),
    (1024, 4, 0.01, 1, "r1024_n4_pe01_b1"),
    (2048, 4, 0.01, 1, "r2048_n4_pe01_b1"),
    (4096, 4, 0.01, 1, "r4096_n4_pe01_b1"),
    (512, 5, 0.01, 1, "r512_n5_pe01_b1"),
    (1024, 5, 0.01, 1, "r1024_n5_pe01_b1"),
    (2048, 5, 0.01, 1, "r2048_n5_pe01_b1"),
    (4096, 5, 0.01, 1, "r4096_n5_pe01_b1"),
]

CONFIGS = _SCALE_TEST_CONFIGS if os.getenv("FHE_SCALE_TEST", "0").lower() in ("1", "true", "yes") else _BASE_CONFIGS

QUALITY_THRESHOLD = 0.95

_weights = None
_config = None


def _load():
    global _weights, _config
    if _weights is not None:
        return _weights, _config
    if "qwen3.5" in MODEL_ID.lower() or "qwen3.6" in MODEL_ID.lower():
        _weights, _config = _load_synthetic_qwen_moe(MODEL_ID)
        return _weights, _config
    config_path = hf_hub_download(MODEL_ID, "config.json")
    with open(config_path) as f:
        _config = json.load(f)
    path = hf_hub_download(MODEL_ID, "model.safetensors")
    weights = load_file(path)
    prefix = "model.layers.2."
    _weights = {k: weights[f"{prefix}{n}"].float() for k, n in {
        "q": "self_attn.q_proj.weight",
        "k": "self_attn.k_proj.weight",
        "v": "self_attn.v_proj.weight",
        "o": "self_attn.out_proj.weight",
        "w1": "feed_forward.w1.weight",
        "w2": "feed_forward.w2.weight",
        "w3": "feed_forward.w3.weight",
    }.items()}
    return _weights, _config


def _svd_decompose(weight_matrix, k):
    U, S, Vh = torch.linalg.svd(weight_matrix, full_matrices=False)
    U_k = U[:, :k] @ torch.diag(S[:k])
    V_k = Vh[:k, :]
    return U_k, V_k


class BlockDiagLinear(nn.Module):
    """Block-diagonal linear layer for batched FHE inference.
    
    Creates a single nn.Linear with block-diagonal weights so each block
    processes one sample independently. No reshape needed — just one matmul.
    Quality is identical to batch=1 since each block is the same weight matrix.
    """
    def __init__(self, weight, batch_size):
        super().__init__()
        in_features = weight.shape[1]
        out_features = weight.shape[0]
        block_weight = torch.block_diag(*([weight] * batch_size))
        self.linear = nn.Linear(batch_size * in_features, batch_size * out_features, bias=False)
        self.linear.weight.data = block_weight
        self.batch_size = batch_size
        self.in_features = in_features
        self.out_features = out_features
        
    def forward(self, x):
        return self.linear(x)


def _compile_and_test_batched(module, name, input_shape, ref, test_input, out_dir,
                               n_bits, p_error, batch_size):
    import tempfile
    work_dir = Path(tempfile.mkdtemp(prefix=f"fhe_{name}_"))

    if batch_size > 1:
        weight = module.weight.data
        module = BlockDiagLinear(weight, batch_size)
        calib = torch.randn(10, batch_size * input_shape[1])
    else:
        calib = torch.randn(*input_shape)
    kwargs = dict(n_bits=n_bits, p_error=p_error, device="cuda")

    print(f"  Compiling {name} (n_bits={n_bits}, p_error={p_error}, batch={batch_size})...", flush=True)
    t0 = time.time()
    circuit = compile_torch_model(module, calib, **kwargs)
    compile_time = time.time() - t0

    FHEModelDev(work_dir, circuit).save()

    client = FHEModelClient(work_dir)
    eval_keys = client.get_serialized_evaluation_keys()
    if batch_size > 1:
        enc_input = test_input.flatten().reshape(1, -1)
    else:
        enc_input = test_input
    encrypted = client.quantize_encrypt_serialize(enc_input)

    server = FHEModelServer(work_dir)
    _ = server.run(encrypted, eval_keys)

    times = []
    for _ in range(5):
        t0 = time.time()
        enc_out = server.run(encrypted, eval_keys)
        times.append(time.time() - t0)

    inference_time = min(times)
    result = client.deserialize_decrypt_dequantize(enc_out)
    if batch_size > 1:
        result = result.reshape(batch_size, -1)

    cosines = []
    for i in range(batch_size):
        r_flat = result[i].flatten()
        ref_flat = ref[i].flatten()
        c = np.dot(r_flat, ref_flat) / (
            np.linalg.norm(r_flat) * np.linalg.norm(ref_flat) + 1e-10
        )
        cosines.append(c)
    avg_cos = float(np.mean(cosines))
    tokens_per_min = batch_size * 60 / inference_time

    # Test parallel circuit execution (run multiple inferences concurrently)
    parallel_tpm = None
    parallel_n = 4
    try:
        if batch_size > 1:
            par_shape = (1, batch_size * input_shape[1])
        else:
            par_shape = input_shape
        enc_inputs = [client.quantize_encrypt_serialize(
            np.random.randn(*par_shape).astype(np.float32)
        ) for _ in range(parallel_n)]
        servers = [FHEModelServer(work_dir) for _ in range(parallel_n)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=parallel_n) as executor:
            t0 = time.time()
            futures = [executor.submit(servers[i].run, enc_inputs[i], eval_keys)
                       for i in range(parallel_n)]
            _ = [f.result() for f in futures]
            parallel_time = time.time() - t0
        parallel_tpm = parallel_n * batch_size * 60 / parallel_time
        print(f"    compile={compile_time:.1f}s, inference={inference_time:.3f}s, "
              f"batch={batch_size}, cos={avg_cos:.4f}, {tokens_per_min:.1f} tok/min, "
              f"parallel x{parallel_n}={parallel_tpm:.1f} tok/min", flush=True)
    except Exception as e:
        print(f"    compile={compile_time:.1f}s, inference={inference_time:.3f}s, "
              f"batch={batch_size}, cos={avg_cos:.4f}, {tokens_per_min:.1f} tok/min, "
              f"parallel failed: {e}", flush=True)

    return {
        "compile_time": compile_time,
        "inference_time": inference_time,
        "cosine": avg_cos,
        "batch_size": batch_size,
        "tokens_per_min": tokens_per_min,
        "parallel_tokens_per_min": parallel_tpm,
        "fhe_result": result,
    }


def _run_single_config(idx, rank, n_bits, p_error, batch_size, label, hidden,
                        composed_all_np):
    """Run a single config in its own subprocess to avoid compile_torch_model caching."""
    import tempfile, pickle
    result_file = Path(tempfile.mktemp(prefix=f"fhe_result_{label}_"))
    wrapper = Path(tempfile.mktemp(prefix="fhe_single_", suffix=".py"))

    wrapper.write_text(
        f"import sys, json, pickle, time, traceback\n"
        f"sys.path.insert(0, '/app')\n"
        f"import numpy as np, torch, torch.nn as nn\n"
        f"from optimizer import _compile_and_test_batched, _svd_decompose, QUALITY_THRESHOLD\n"
        f"hidden = {hidden}\n"
        f"composed_all = torch.from_numpy(np.load('/tmp/_composed_all.npy'))\n"
        f"batch_size = {batch_size}\n"
        f"x_np = np.load('/tmp/_test_input.npy')\n"
        f"x_t = torch.from_numpy(x_np)\n"
        f"ref_full = (x_t @ composed_all.T).numpy()\n"
        f"rank = {rank}\n"
        f"if rank >= 8192:\n"
        f"    mod = nn.Linear(hidden, composed_all.shape[0], bias=False)\n"
        f"    mod.weight.data = composed_all\n"
        f"    ref = ref_full\n"
        f"    r = _compile_and_test_batched(mod, '{label}', (batch_size, hidden), ref, x_np, None, {n_bits}, {p_error}, batch_size)\n"
        f"    r['full_cosine'] = r['cosine']\n"
        f"    r['strategy'] = 'full'\n"
        f"else:\n"
        f"    U_k, V_k = _svd_decompose(composed_all, rank)\n"
        f"    mod = nn.Linear(hidden, rank, bias=False)\n"
        f"    mod.weight.data = V_k\n"
        f"    ref = (x_t @ V_k.T).numpy()\n"
        f"    r = _compile_and_test_batched(mod, '{label}', (batch_size, hidden), ref, x_np, None, {n_bits}, {p_error}, batch_size)\n"
        f"    fhe_small = r['fhe_result']\n"
        f"    U_np = U_k.numpy()\n"
        f"    reconstructed = fhe_small @ U_np.T\n"
        f"    full_cosines = []\n"
        f"    for i in range(batch_size):\n"
        f"        r_flat = reconstructed[i].flatten()\n"
        f"        ref_flat = ref_full[i].flatten()\n"
        f"        c = np.dot(r_flat, ref_flat) / (np.linalg.norm(r_flat) * np.linalg.norm(ref_flat) + 1e-10)\n"
        f"        full_cosines.append(c)\n"
        f"    r['full_cosine'] = float(np.mean(full_cosines))\n"
        f"    r['strategy'] = 'lowrank'\n"
        f"r['label'] = '{label}'\n"
        f"r['rank'] = rank\n"
        f"r['n_bits'] = {n_bits}\n"
        f"r['p_error'] = {p_error}\n"
        f"r['tokens_per_min'] = batch_size * 60 / r['inference_time']\n"
        f"del r['fhe_result']\n"
        f"pickle.dump(r, open('{result_file}', 'wb'))\n"
        f"print('DONE', flush=True)\n"
    )

    env = dict(os.environ)
    env["PYTHONUNBUFFERED"] = "1"
    proc = subprocess.run(
        [sys.executable, "-u", str(wrapper)],
        env=env, capture_output=True, text=True, timeout=3600
    )
    print(proc.stdout, flush=True)
    if proc.returncode != 0:
        print(f"  SUBPROCESS ERROR for {label}:\n{proc.stderr}", flush=True)
        raise RuntimeError(f"Subprocess failed for {label}: {proc.stderr[-500:]})")

    r = pickle.load(open(result_file, 'rb'))
    result_file.unlink(missing_ok=True)
    wrapper.unlink(missing_ok=True)
    return r


@app.get("/health")
async def health():
    return JSONResponse(content={
        "status": "ok",
        "model": MODEL_ID,
        "worker_index": FHE_WORKER_INDEX,
        "worker_count": FHE_WORKER_COUNT,
        "worker_configs": len(_WORKER_CONFIGS),
        "gpu_enabled": concrete.compiler.check_gpu_enabled(),
    })


@app.get("/worker")
async def worker_info():
    """Return this worker's identity and assigned config subset."""
    return JSONResponse(content={
        "worker_index": FHE_WORKER_INDEX,
        "worker_count": FHE_WORKER_COUNT,
        "model": MODEL_ID,
        "hostname": os.getenv("HOSTNAME", ""),
        "configs": [c[4] for c in _WORKER_CONFIGS],
        "autostart": FHE_AUTOSTART,
    })


_WORKER_CONFIGS = _get_worker_configs()
_opt_status = {"running": False, "done": False, "progress": 0, "total": len(_WORKER_CONFIGS), "current": ""}
_opt_results = None
_STATUS_FILE = Path("/app/status.json")
_RESULTS_FILE = OUT_DIR / f"results_worker_{FHE_WORKER_INDEX}.json"


def _write_status():
    with open(_STATUS_FILE, "w") as f:
        json.dump(_opt_status, f)


def _read_status():
    if _STATUS_FILE.exists():
        with open(_STATUS_FILE) as f:
            return json.load(f)
    return {"running": False, "done": False, "progress": 0, "total": len(_WORKER_CONFIGS), "current": ""}


def _run_optimization():
    global _opt_results
    if _opt_status["running"]:
        return
    _opt_status["running"] = True
    _opt_status["done"] = False
    _opt_status["progress"] = 0
    _opt_status.pop("error", None)
    _write_status()

    import shutil
    if OUT_DIR.exists() and any(OUT_DIR.iterdir()):
        archive_dir = Path(f"/app/batched_opt_archive_{int(time.time())}")
        shutil.move(str(OUT_DIR), str(archive_dir))
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        w, config = _load()
        hidden = config["hidden_size"]

        result = subprocess.run(["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
                              capture_output=True, text=True)
        gpu_name = result.stdout.strip()

        np.random.seed(42)

        composed_all = torch.cat([
            w["q"], w["k"], w["v"], w["o"], w["w1"], w["w3"]
        ], dim=0)
        np.save("/tmp/_composed_all.npy", composed_all.numpy())

        results = []
        worker_configs = _get_worker_configs()

        for idx, (rank, n_bits, p_error, batch_size, label) in enumerate(worker_configs):
            print(f"\n[{idx+1}/{len(worker_configs)}] {label} (worker={FHE_WORKER_INDEX})", flush=True)

            x_np = np.random.randn(batch_size, hidden).astype(np.float32)
            np.save("/tmp/_test_input.npy", x_np)

            try:
                r = _run_single_config(idx, rank, n_bits, p_error, batch_size, label,
                                       hidden, composed_all.numpy())
                print(f"  {label}: {r['tokens_per_min']:.1f} tok/min, full_cos={r['full_cosine']:.4f}", flush=True)
                results.append(r)
            except Exception as e:
                print(f"  {label}: FAILED - {e}", flush=True)
                results.append({"label": label, "error": str(e), "tokens_per_min": 0, "full_cosine": 0})
            _opt_status["progress"] = idx + 1
            _opt_status["current"] = label
            _write_status()

        # Pick best
        best = None
        for r in results:
            if "error" in r:
                continue
            if r["full_cosine"] >= QUALITY_THRESHOLD:
                if best is None or r["tokens_per_min"] > best["tokens_per_min"]:
                    best = r

        if best is None:
            for r in results:
                if "error" in r:
                    continue
                if r["full_cosine"] >= 0.90:
                    if best is None or r["tokens_per_min"] > best["tokens_per_min"]:
                        best = r

        if best is None:
            valid = [r for r in results if "error" not in r]
            if valid:
                best = max(valid, key=lambda r: r["tokens_per_min"])
                print(f"\n  WARNING: No config met quality threshold {QUALITY_THRESHOLD}")

        print("\n" + "=" * 70)
        print("ALL RESULTS (sorted by speed)")
        print("=" * 70)
        for r in sorted(results, key=lambda x: x.get("tokens_per_min", 0), reverse=True):
            marker = " *** BEST" if r is best else ""
            if "error" in r:
                print(f"  {r['label']:>25s}: FAILED - {r['error'][:60]}{marker}")
            else:
                ptpm = r.get("parallel_tokens_per_min")
                p_str = f", parallel={ptpm:.1f} tok/min" if ptpm else ""
                print(f"  {r['label']:>25s}: {r['tokens_per_min']:7.1f} tok/min, "
                      f"full_cos={r['full_cosine']:.4f}, "
                      f"time={r['inference_time']:.3f}s, batch={r['batch_size']}{p_str}{marker}")
        print("=" * 70)
        print(f"BEST: {best['label']}, {best['tokens_per_min']:.1f} tok/min, "
              f"quality={best['full_cosine']:.4f}")
        print("=" * 70)

        output = {
            "gpu": gpu_name,
            "worker_index": FHE_WORKER_INDEX,
            "worker_count": FHE_WORKER_COUNT,
            "quality_threshold": QUALITY_THRESHOLD,
            "best": best,
            "all_results": results,
        }
        with open(_RESULTS_FILE, "w") as f:
            json.dump(output, f, indent=2, default=str)

        _opt_results = output
        _opt_status["done"] = True
        _opt_status["running"] = False
        _write_status()

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        _opt_status["done"] = True
        _opt_status["running"] = False
        _opt_status["error"] = str(e)
        _write_status()


def _start_optimization_subprocess():
    """Launch the optimization in a detached subprocess."""
    global opt_proc
    if opt_proc and opt_proc.poll() is None:
        return None
    wrapper = "/app/_run_opt.py"
    with open(wrapper, "w") as f:
        f.write(
            "import sys, traceback\n"
            "log = open('/app/opt_subprocess.log', 'w', buffering=1)\n"
            "sys.stdout = log\n"
            "sys.stderr = log\n"
            "sys.path.insert(0, '/app')\n"
            "print('Subprocess started', flush=True)\n"
            "try:\n"
            "    from optimizer import _run_optimization\n"
            "    _run_optimization()\n"
            "except Exception as e:\n"
            "    traceback.print_exc()\n"
            "    print('FATAL:', e, flush=True)\n"
        )
    opt_cmd = [sys.executable, "-u", wrapper]
    env = dict(os.environ)
    env["PYTHONUNBUFFERED"] = "1"
    # Redirect stderr to crash log so we can see if wrapper fails before opening main log
    crash_log = open("/app/opt_crash.log", "w")
    opt_proc = subprocess.Popen(opt_cmd, env=env,
                                stdout=crash_log, stderr=crash_log)
    return opt_proc


@app.get("/start")
async def start_optimization():
    """Manually trigger optimization subprocess."""
    proc = _start_optimization_subprocess()
    if proc is None:
        return JSONResponse(content={"status": "already_running"})
    return JSONResponse(content={"status": "started", "pid": proc.pid})


@app.on_event("startup")
async def startup_event():
    """Auto-start optimization when FHE_AUTOSTART is enabled."""
    if FHE_AUTOSTART:
        print("FHE_AUTOSTART is enabled; launching optimization subprocess...", flush=True)
        _start_optimization_subprocess()


@app.get("/logs")
async def get_logs():
    """Read subprocess logs for debugging."""
    try:
        with open("/app/opt_subprocess.log") as f:
            return JSONResponse(content={"logs": f.read()[-3000:]})
    except Exception as e:
        # Try crash log
        try:
            with open("/app/opt_crash.log") as f:
                return JSONResponse(content={"logs": f.read()[-3000:], "note": "from crash log"})
        except Exception:
            return JSONResponse(content={"logs": "", "error": str(e)})


@app.get("/optimize")
async def optimize():
    """Report optimization status. Runs at startup in child process."""
    s = _read_status()
    return JSONResponse(content={"status": "running" if s.get("running") else "done" if s.get("done") else "idle", **s})


@app.get("/status")
async def status():
    return JSONResponse(content=_read_status())


@app.get("/results")
async def results():
    if _opt_results is not None:
        return JSONResponse(content=json.loads(json.dumps(_opt_results, default=str)))
    # Try reading from this worker's results file
    if _RESULTS_FILE.exists():
        with open(_RESULTS_FILE) as f:
            return JSONResponse(content=json.load(f))
    return JSONResponse(content={"status": "no_results", **_opt_status})


if __name__ == "__main__":
    import uvicorn

    print("Server starting. Use /start to trigger optimization.")
    sys.stdout.flush()
    uvicorn.run(app, host="0.0.0.0", port=8080)
