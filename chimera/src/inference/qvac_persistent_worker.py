#!/usr/bin/env python3
import sys, json, os, warnings
warnings.filterwarnings("ignore")

MODEL_PATH = "/home/user/.qvac/models/f2bade0bc5cd4a8c_Llama-3.2-1B-Instruct-Q4_0.gguf"
SYS_PROMPT = (
    "You are a helpful wiki writer. Write high-quality markdown. "
    "Use headings, lists, bold, code blocks, and wiki links [[PageName]] where relevant. "
    "Output ONLY the markdown body."
)

try:
    from llama_cpp import Llama
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(MODEL_PATH)
    llm = Llama(model_path=MODEL_PATH, n_ctx=512, verbose=False)
    sys.stderr.write("READY\n"); sys.stderr.flush()
except Exception as e:
    sys.stderr.write(f"FAILED: {e}\n"); sys.stderr.flush(); sys.exit(1)

while True:
    line = sys.stdin.readline()
    if not line:
        break
    line = line.strip()
    if not line:
        continue
    try:
        data = json.loads(line)
        prompt = data.get("prompt", "")
        title = data.get("title", prompt[:60])
        text_prompt = (
            f"<|begin_of_text|>  system\n\n{SYS_PROMPT}<|eot_id|>"
            f"  user\n\nWrite a wiki page about: {prompt}<|eot_id|>  assistant\n\n"
        )
        output = llm(text_prompt, max_tokens=500, stop=["<|eot_id|>"], temperature=0.7)
        body = output["choices"][0]["text"].strip()
        result = {"title": title, "body": body, "source": "qvac", "model": "Llama-3.2-1B-Instruct-Q4_0"}
    except Exception as e:
        import traceback
        result = {"error": str(e), "trace": traceback.format_exc(), "source": "error"}
    sys.stdout.write(json.dumps(result) + "\n")
    sys.stdout.flush()
