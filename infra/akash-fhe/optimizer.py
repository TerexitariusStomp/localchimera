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

MODEL_ID = "LiquidAI/LFM2.5-230M"
OUT_DIR = Path("/app/batched_opt")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Configs: (rank, n_bits, p_error, batch_size)
# Focus on maintaining quality >= 0.95 while maximizing throughput
CONFIGS = [
    # Baseline: full composed, no low-rank, batch=1
    (1024, 5, 0.02, 1, "baseline_full"),

    # Full rank (lossless SVD) with various precision, batched
    (1024, 5, 0.01, 1, "r1024_n5_pe01_b1"),
    (1024, 5, 0.01, 4, "r1024_n5_pe01_b4"),
    (1024, 5, 0.01, 8, "r1024_n5_pe01_b8"),
    (1024, 5, 0.01, 16, "r1024_n5_pe01_b16"),
    (1024, 5, 0.01, 32, "r1024_n5_pe01_b32"),

    (1024, 6, 0.01, 1, "r1024_n6_pe01_b1"),
    (1024, 6, 0.01, 4, "r1024_n6_pe01_b4"),
    (1024, 6, 0.01, 8, "r1024_n6_pe01_b8"),
    (1024, 6, 0.01, 16, "r1024_n6_pe01_b16"),
    (1024, 6, 0.01, 32, "r1024_n6_pe01_b32"),

    (1024, 7, 0.01, 1, "r1024_n7_pe01_b1"),
    (1024, 7, 0.01, 8, "r1024_n7_pe01_b8"),
    (1024, 7, 0.01, 16, "r1024_n7_pe01_b16"),
    (1024, 7, 0.01, 32, "r1024_n7_pe01_b32"),

    # Also test p_error=0.005 for max quality
    (1024, 6, 0.005, 8, "r1024_n6_pe005_b8"),
    (1024, 6, 0.005, 16, "r1024_n6_pe005_b16"),
    (1024, 7, 0.005, 8, "r1024_n7_pe005_b8"),
    (1024, 7, 0.005, 16, "r1024_n7_pe005_b16"),

    # Direct full circuit (no SVD) batched for comparison
    (8192, 5, 0.02, 4, "full_n5_b4"),
    (8192, 5, 0.02, 8, "full_n5_b8"),
    (8192, 6, 0.01, 4, "full_n6_b4"),
    (8192, 6, 0.01, 8, "full_n6_b8"),
]

QUALITY_THRESHOLD = 0.95

_weights = None
_config = None


def _load():
    global _weights, _config
    if _weights is not None:
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


class BatchedLinear(nn.Module):
    """Wraps nn.Linear to accept flattened batch input for FHE compilation.
    
    Concrete-ML's compile_torch_model infers input shape from the first dimension of
    calibration data, treating it as a sample dimension. So a (4, 1024) inputset
    results in a circuit expecting (1, 1024). This wrapper flattens the batch
    dimension into the feature dimension so the circuit sees (batch*hidden,) input
    and produces (batch*output_size,) output.
    """
    def __init__(self, linear, batch_size):
        super().__init__()
        self.linear = linear
        self.batch_size = batch_size
        self.in_features = linear.in_features
        self.out_features = linear.out_features
        
    def forward(self, x):
        # x shape: (batch_size * in_features,)
        x = x.reshape(self.batch_size, self.in_features)
        out = self.linear(x)
        return out.flatten()


def _compile_and_test_batched(module, name, input_shape, ref, test_input, out_dir,
                               n_bits, p_error, batch_size):
    import tempfile
    work_dir = Path(tempfile.mkdtemp(prefix=f"fhe_{name}_"))

    if batch_size > 1:
        module = BatchedLinear(module, batch_size)
        calib = torch.randn(batch_size * input_shape[1])
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
        enc_input = test_input.flatten()
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

    print(f"    compile={compile_time:.1f}s, inference={inference_time:.3f}s, "
          f"batch={batch_size}, cos={avg_cos:.4f}, {tokens_per_min:.1f} tok/min", flush=True)

    return {
        "compile_time": compile_time,
        "inference_time": inference_time,
        "cosine": avg_cos,
        "batch_size": batch_size,
        "tokens_per_min": tokens_per_min,
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
        env=env, capture_output=True, text=True, timeout=1800
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
        "gpu_enabled": concrete.compiler.check_gpu_enabled(),
    })


_opt_status = {"running": False, "done": False, "progress": 0, "total": len(CONFIGS), "current": ""}
_opt_results = None
_STATUS_FILE = OUT_DIR / "status.json"


def _write_status():
    with open(_STATUS_FILE, "w") as f:
        json.dump(_opt_status, f)


def _read_status():
    if _STATUS_FILE.exists():
        with open(_STATUS_FILE) as f:
            return json.load(f)
    return {"running": False, "done": False, "progress": 0, "total": len(CONFIGS), "current": ""}


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
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
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

        for idx, (rank, n_bits, p_error, batch_size, label) in enumerate(CONFIGS):
            print(f"\n[{idx+1}/{len(CONFIGS)}] {label}", flush=True)

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
            if r["full_cosine"] >= QUALITY_THRESHOLD:
                if best is None or r["tokens_per_min"] > best["tokens_per_min"]:
                    best = r

        if best is None:
            for r in results:
                if r["full_cosine"] >= 0.90:
                    if best is None or r["tokens_per_min"] > best["tokens_per_min"]:
                        best = r

        if best is None:
            best = max(results, key=lambda r: r["tokens_per_min"])
            print(f"\n  WARNING: No config met quality threshold {QUALITY_THRESHOLD}")

        print("\n" + "=" * 70)
        print("ALL RESULTS (sorted by speed)")
        print("=" * 70)
        for r in sorted(results, key=lambda x: x["tokens_per_min"], reverse=True):
            marker = " *** BEST" if r is best else ""
            print(f"  {r['label']:>25s}: {r['tokens_per_min']:7.1f} tok/min, "
                  f"full_cos={r['full_cosine']:.4f}, "
                  f"time={r['inference_time']:.3f}s, batch={r['batch_size']}{marker}")
        print("=" * 70)
        print(f"BEST: {best['label']}, {best['tokens_per_min']:.1f} tok/min, "
              f"quality={best['full_cosine']:.4f}")
        print("=" * 70)

        output = {
            "gpu": gpu_name,
            "quality_threshold": QUALITY_THRESHOLD,
            "best": best,
            "all_results": results,
        }
        with open(OUT_DIR / "results.json", "w") as f:
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


@app.get("/start")
async def start_optimization():
    """Manually trigger optimization subprocess."""
    global opt_proc
    if opt_proc and opt_proc.poll() is None:
        return JSONResponse(content={"status": "already_running"})
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
    return JSONResponse(content={"status": "started", "pid": opt_proc.pid})


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
    # Try reading from file
    results_file = OUT_DIR / "results.json"
    if results_file.exists():
        with open(results_file) as f:
            return JSONResponse(content=json.load(f))
    return JSONResponse(content={"status": "no_results", **_opt_status})


if __name__ == "__main__":
    import uvicorn

    print("Server starting. Use /start to trigger optimization.")
    sys.stdout.flush()
    uvicorn.run(app, host="0.0.0.0", port=8080)
