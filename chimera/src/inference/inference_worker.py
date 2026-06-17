#!/usr/bin/env python3
"""QVAC inference using llama.cpp with the QVAC model file."""
import sys
import json
import os
import warnings

warnings.filterwarnings("ignore")

MODEL_PATH = "/home/user/.qvac/models/f2bade0bc5cd4a8c_Llama-3.2-1B-Instruct-Q4_0.gguf"

def generate(prompt, title="", max_tokens=500):
    try:
        from llama_cpp import Llama
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"QVAC model not found: {MODEL_PATH}")
        llm = Llama(model_path=MODEL_PATH, n_ctx=512, verbose=False)
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

if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = generate(data.get("prompt", ""), data.get("title", ""))
    print(json.dumps(result))
