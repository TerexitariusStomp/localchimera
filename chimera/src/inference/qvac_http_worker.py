#!/usr/bin/env python3
"""QVAC inference HTTP worker using llama.cpp with the QVAC model file."""
import os
import sys
import json
import warnings
from http.server import HTTPServer, BaseHTTPRequestHandler

warnings.filterwarnings("ignore")

MODEL_PATH = "/home/user/.qvac/models/f2bade0bc5cd4a8c_Llama-3.2-1B-Instruct-Q4_0.gguf"
PORT = int(os.environ.get("QVAC_WORKER_PORT", "3456"))

sys.stderr.write("[Worker] Loading QVAC model...\n")
sys.stderr.flush()

try:
    from llama_cpp import Llama
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"QVAC model not found: {MODEL_PATH}")
    llm = Llama(model_path=MODEL_PATH, n_ctx=2048, verbose=False)
    sys.stderr.write("[Worker] Model ready.\n")
    sys.stderr.flush()
except Exception as e:
    sys.stderr.write(f"[Worker] Failed to load model: {e}\n")
    sys.stderr.flush()
    sys.exit(1)

def generate(prompt, title="", max_tokens=500):
    try:
        sys_prompt = (
            "You are a helpful wiki writer. Write high-quality markdown. "
            "Use headings, lists, bold, code blocks, and wiki links [[PageName]] where relevant. "
            "Output ONLY the markdown body."
        )
        full_prompt = f"<|begin_of_text|>  system\n\n{sys_prompt}<|eot_id|>  user\n\nWrite a wiki page about: {prompt}<|eot_id|>  assistant\n\n"
        output = llm(full_prompt, max_tokens=max_tokens, stop=["<|eot_id|>", "<|endoftext|>"], temperature=0.7)
        text = output["choices"][0]["text"].strip()
        return {"title": title or prompt.split(".")[0][:60], "body": text, "source": "qvac", "model": "Llama-3.2-1B-Instruct-Q4_0"}
    except Exception as e:
        import traceback
        return {"title": title or prompt, "body": f"Error: {e}\n{traceback.format_exc()}", "source": "error", "model": "none"}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_POST(self):
        if self.path != "/generate":
            self.send_error(404)
            return
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(body)
            result = generate(data.get("prompt", ""), data.get("title", ""))
            response = json.dumps(result).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
        except Exception as e:
            import traceback
            err = json.dumps({"error": str(e), "trace": traceback.format_exc()}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(err)

if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    sys.stderr.write(f"[Worker] Listening on http://127.0.0.1:{PORT}/generate\n")
    sys.stderr.flush()
    server.serve_forever()
