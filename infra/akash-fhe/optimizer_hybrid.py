"""
FHE Hybrid LLM Optimizer using Concrete-ML HybridFHEModel.

All linear layers run remotely in FHE (server-side on Akash H100).
All non-linear layers (attention, softmax, layer norm, activation) run client-side
(usually in the browser or a local client).

This is the realistic path to full GLM-4-32B end-to-end FHE inference.
"""
import os
import sys
import time
import json
import shutil
import contextlib
import threading
import tempfile
import numpy as np
import torch
from pathlib import Path
from transformers import AutoModelForCausalLM, AutoTokenizer, Conv1D

from concrete.ml.torch.hybrid_model import HybridFHEModel

from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="FHE Hybrid LLM Optimizer", version="0.1.0")

# Global thread handle for manual trigger
opt_proc = None

MODEL_ID = os.getenv("FHE_MODEL_ID", "openai-community/gpt2")
# Bump this comment to trigger CI rebuild: rev 1
OUT_DIR = Path("/app/hybrid_fhe")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def _detect_worker_index() -> int:
    """Detect worker index from Kubernetes-style hostname or env var."""
    hostname = os.getenv("HOSTNAME", "")
    m = __import__("re").search(r"-(\d+)$", hostname)
    if m:
        return int(m.group(1))
    val = os.getenv("FHE_WORKER_INDEX", "0")
    try:
        return int(val)
    except ValueError:
        return 0


FHE_WORKER_INDEX = _detect_worker_index()
try:
    FHE_WORKER_COUNT = int(os.getenv("FHE_WORKER_COUNT", "1"))
except ValueError:
    FHE_WORKER_COUNT = 1
FHE_AUTOSTART = os.getenv("FHE_AUTOSTART", "0").lower() in ("1", "true", "yes")
FHE_MODE = os.getenv("FHE_HYBRID_MODE", "execute")  # "simulate", "execute", "remote"
FHE_SERVER_URL = os.getenv("FHE_SERVER_URL", "")

_hybrid_status = {
    "running": False,
    "done": False,
    "progress": 0,
    "message": "idle",
    "total_steps": 100,
}
_hybrid_results = None
_STATUS_FILE = Path("/app/hybrid_status.json")
_RESULTS_FILE = OUT_DIR / f"results_worker_{FHE_WORKER_INDEX}.json"


def _write_status():
    with open(_STATUS_FILE, "w") as f:
        json.dump(_hybrid_status, f)


def _read_status():
    if _STATUS_FILE.exists():
        with open(_STATUS_FILE) as f:
            return json.load(f)
    return _hybrid_status.copy()


def _run_hybrid_optimization():
    """Load a model, compile all linear layers with HybridFHEModel, and test inference."""
    global _hybrid_results
    if _hybrid_status.get("running"):
        return
    _hybrid_status.update({"running": True, "done": False, "progress": 0, "message": "Starting...", "error": None})
    _write_status()

    if OUT_DIR.exists() and any(OUT_DIR.iterdir()):
        archive_dir = Path(f"/app/hybrid_fhe_archive_{int(time.time())}")
        shutil.move(str(OUT_DIR), str(archive_dir))
        OUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        # 1. Load model and tokenizer
        _hybrid_status.update({"progress": 5, "message": f"Loading {MODEL_ID}..."})
        _write_status()
        print(f"Loading tokenizer and model {MODEL_ID}...", flush=True)
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        dtype = torch.float16 if os.getenv("FHE_USE_FP16", "1").lower() in ("1", "true", "yes") else torch.float32
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            device_map="cpu",
            low_cpu_mem_usage=True,
            trust_remote_code=True,
        )
        model.eval()
        print(f"Model loaded: {sum(p.numel() for p in model.parameters()) / 1e9:.2f}B params", flush=True)

        # 2. Identify remote linear layers
        _hybrid_status.update({"progress": 20, "message": "Identifying remote linear layers..."})
        _write_status()
        remote_names = []
        for name, module in model.named_modules():
            if isinstance(module, (torch.nn.Linear, Conv1D)):
                remote_names.append(name)
        print(f"Found {len(remote_names)} remote linear modules", flush=True)

        # 3. Build HybridFHEModel
        _hybrid_status.update({"progress": 30, "message": "Creating HybridFHEModel..."})
        _write_status()
        hybrid_model = HybridFHEModel(model, module_names=remote_names)

        # 4. Compile with calibration input
        _hybrid_status.update({"progress": 40, "message": "Compiling FHE circuits..."})
        _write_status()
        input_tensor = torch.randint(0, tokenizer.vocab_size, (1, 32), dtype=torch.long)
        n_bits = int(os.getenv("FHE_N_BITS", "8"))
        use_dynamic_quantization = os.getenv("FHE_DYNAMIC_QUANT", "1").lower() in ("1", "true", "yes")

        t0 = time.time()
        hybrid_model.compile_model(
            input_tensor,
            n_bits=n_bits,
            use_dynamic_quantization=use_dynamic_quantization,
        )
        compile_time = time.time() - t0
        print(f"Compilation done in {compile_time:.1f}s", flush=True)

        # 5. Save artifacts
        _hybrid_status.update({"progress": 70, "message": "Saving FHE artifacts..."})
        _write_status()
        hybrid_model.save_and_clear_private_info(OUT_DIR)
        print(f"Artifacts saved to {OUT_DIR}", flush=True)

        # 6. Test simulate mode (clear data, FHE circuit simulated)
        _hybrid_status.update({"progress": 80, "message": "Testing simulate mode..."})
        _write_status()
        hybrid_model.set_fhe_mode("simulate")
        prompt = "Hello"
        inputs = tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            output_sim = model.generate(
                **inputs,
                max_new_tokens=1,
                do_sample=False,
                pad_token_id=tokenizer.eos_token_id,
            )
        sim_text = tokenizer.decode(output_sim[0], skip_special_tokens=True)
        print(f"Simulate output: {sim_text!r}", flush=True)

        # 7. Test execute mode (actual FHE)
        _hybrid_status.update({"progress": 90, "message": "Testing execute mode..."})
        _write_status()
        hybrid_model.set_fhe_mode("execute")
        t0 = time.time()
        with torch.no_grad():
            output_exec = model.generate(
                **inputs,
                max_new_tokens=1,
                do_sample=False,
                pad_token_id=tokenizer.eos_token_id,
            )
        exec_time = time.time() - t0
        exec_text = tokenizer.decode(output_exec[0], skip_special_tokens=True)
        print(f"Execute output: {exec_text!r} in {exec_time:.1f}s", flush=True)

        # 8. Results
        _hybrid_results = {
            "model_id": MODEL_ID,
            "remote_modules": len(remote_names),
            "compile_time": compile_time,
            "simulate_output": sim_text,
            "execute_output": exec_text,
            "execute_time": exec_time,
            "n_bits": n_bits,
            "dynamic_quantization": use_dynamic_quantization,
        }
        with open(_RESULTS_FILE, "w") as f:
            json.dump(_hybrid_results, f, indent=2, default=str)

        _hybrid_status.update({"running": False, "done": True, "progress": 100, "message": "Done"})
        _write_status()
        print("Results:", json.dumps(_hybrid_results, indent=2), flush=True)

    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        import traceback
        traceback.print_exc()
        _hybrid_status.update({"running": False, "done": True, "progress": 0, "message": f"Failed: {e}", "error": str(e)})
        _write_status()


def _start_optimization_thread():
    """Launch the hybrid optimization in a background daemon thread."""
    global opt_proc
    if opt_proc and opt_proc.is_alive():
        return None

    log_file = open("/app/hybrid_opt_subprocess.log", "w", buffering=1)

    def run_with_logging():
        with contextlib.redirect_stdout(log_file), contextlib.redirect_stderr(log_file):
            try:
                _run_hybrid_optimization()
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"FATAL: {e}", flush=True)

    opt_proc = threading.Thread(target=run_with_logging, daemon=True)
    opt_proc.start()
    return opt_proc


@app.get("/health")
async def health():
    import concrete.compiler
    return JSONResponse(content={
        "status": "ok",
        "model": MODEL_ID,
        "worker_index": FHE_WORKER_INDEX,
        "worker_count": FHE_WORKER_COUNT,
        "gpu_enabled": concrete.compiler.check_gpu_enabled(),
    })


@app.get("/worker")
async def worker_info():
    return JSONResponse(content={
        "worker_index": FHE_WORKER_INDEX,
        "worker_count": FHE_WORKER_COUNT,
        "model": MODEL_ID,
        "hostname": os.getenv("HOSTNAME", ""),
        "autostart": FHE_AUTOSTART,
        "fhe_mode": FHE_MODE,
    })


@app.get("/start")
async def start_optimization():
    """Manually trigger hybrid optimization in a background thread."""
    thread = _start_optimization_thread()
    if thread is None:
        return JSONResponse(content={"status": "already_running"})
    return JSONResponse(content={"status": "started", "thread": True})


@app.get("/optimize")
async def optimize():
    s = _read_status()
    return JSONResponse(content={"status": "running" if s.get("running") else "done" if s.get("done") else "idle", **s})


@app.get("/status")
async def status():
    return JSONResponse(content=_read_status())


@app.get("/results")
async def results():
    if _hybrid_results is not None:
        return JSONResponse(content=json.loads(json.dumps(_hybrid_results, default=str)))
    if _RESULTS_FILE.exists():
        with open(_RESULTS_FILE) as f:
            return JSONResponse(content=json.load(f))
    return JSONResponse(content={"status": "no_results", **_read_status()})


@app.get("/logs")
async def get_logs():
    try:
        with open("/app/hybrid_opt_subprocess.log") as f:
            return JSONResponse(content={"logs": f.read()[-3000:]})
    except Exception as e:
        return JSONResponse(content={"logs": "", "error": str(e)})


@app.on_event("startup")
async def startup_event():
    if FHE_AUTOSTART:
        print("FHE_AUTOSTART is enabled; launching hybrid optimization thread...", flush=True)
        _start_optimization_thread()


if __name__ == "__main__":
    import uvicorn
    print("Hybrid FHE optimizer starting. Use /start to trigger optimization.")
    sys.stdout.flush()
    uvicorn.run(app, host="0.0.0.0", port=8080)
