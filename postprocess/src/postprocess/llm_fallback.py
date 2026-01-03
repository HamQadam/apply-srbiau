# postprocess/llm_fallback.py
import json
import re
from dataclasses import dataclass
from typing import Any, Dict, Optional

from llama_cpp import Llama


@dataclass(frozen=True)
class LLMConfig:
    model_path: str
    n_ctx: int = 1024
    n_batch: int = 128
    n_threads: int = 8


# Keep the prompt very short to reduce prompt-eval time
_INSTRUCTION = (
    "Extract application deadlines from TEXT.\n"
    "Return ONLY JSON:\n"
    '{"spring_mmdd":"MM-DD"|null,"fall_mmdd":"MM-DD"|null,"notes":"..."}\n'
    "Rules: choose latest per semester; for ranges choose END; mmdd must be MM-DD."
)


def _first_json_obj(s: str) -> Optional[str]:
    m = re.search(r"\{.*\}", s, re.S)
    return m.group(0) if m else None


class LLMFallback:
    """
    Lazy-load llama.cpp model on first use.
    """
    def __init__(self, cfg: LLMConfig, enabled: bool = True) -> None:
        self.cfg = cfg
        self.enabled = enabled
        self._llm: Optional[Llama] = None

    def _get_llm(self) -> Llama:
        if self._llm is None:
            # Important: verbose=False stops llama perf spam and reduces overhead.
            self._llm = Llama(
                model_path=self.cfg.model_path,
                n_ctx=self.cfg.n_ctx,
                n_batch=self.cfg.n_batch,
                n_threads=self.cfg.n_threads,
                n_gpu_layers=0,
                verbose=False,
            )
        return self._llm

    def extract_mmdd(self, txt: str) -> Dict[str, Any]:
        llm = self._get_llm()
        resp = llm.create_chat_completion(
            messages=[{"role": "user", "content": f"{_INSTRUCTION}\n\nTEXT:\n{txt}\n"}],
            temperature=0.0,
            max_tokens=120,
            stop=["<|end|>", "<|endoftext|>"],
        )
        content = resp["choices"][0]["message"]["content"]
        js = _first_json_obj(content or "")
        if not js:
            return {"spring_mmdd": None, "fall_mmdd": None, "notes": "LLM produced no JSON."}
        try:
            out = json.loads(js)
            # normalize keys
            return {
                "spring_mmdd": out.get("spring_mmdd"),
                "fall_mmdd": out.get("fall_mmdd"),
                "notes": out.get("notes", ""),
            }
        except Exception:
            return {"spring_mmdd": None, "fall_mmdd": None, "notes": "LLM JSON parse failed."}
