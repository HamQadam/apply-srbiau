"""
LLM client — thin wrapper over LiteLLM for provider-agnostic calls.

Why LiteLLM?
  litellm.completion() speaks a single OpenAI-compatible API regardless of
  whether you're hitting OpenRouter, Groq, Azure, a local Ollama, or any
  other provider.  Switching providers is a one-line env-var change.

Configuration (all via environment variables):
  LITELLM_MODEL          Model string passed straight to litellm.
                         Examples:
                           openrouter/meta-llama/llama-3.1-8b-instruct:free
                           groq/llama-3.1-8b-instant
                           ollama/llama3.2:3b
                         Default: openrouter/meta-llama/llama-3.1-8b-instruct:free

  LITELLM_API_KEY        API key (passed as api_key to litellm).
                         For OpenRouter this is your OpenRouter / LiteLLM key.

  LITELLM_API_BASE       Optional base URL override (e.g. for a self-hosted
                         LiteLLM proxy or Ollama endpoint).

  LITELLM_MAX_TOKENS     Max tokens to generate.  Default: 256
  LITELLM_TEMPERATURE    Sampling temperature.  Default: 0.0 (deterministic)
  LITELLM_TIMEOUT        Request timeout in seconds.  Default: 30
  LITELLM_ENABLED        Set to "false" to disable LLM calls entirely.
                         Default: true
"""
from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field
from typing import Any

log = logging.getLogger(__name__)


def _env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "y", "on")


@dataclass(frozen=True)
class LLMClientConfig:
    model: str = "openrouter/meta-llama/llama-3.1-8b-instruct:free"
    api_key: str | None = None
    api_base: str | None = None
    max_tokens: int = 256
    temperature: float = 0.0
    timeout: int = 30
    enabled: bool = True

    @staticmethod
    def from_env() -> "LLMClientConfig":
        return LLMClientConfig(
            model=os.getenv(
                "LITELLM_MODEL",
                "openrouter/meta-llama/llama-3.1-8b-instruct:free",
            ),
            api_key=os.getenv("LITELLM_API_KEY") or None,
            api_base=os.getenv("LITELLM_API_BASE") or None,
            max_tokens=int(os.getenv("LITELLM_MAX_TOKENS", "256")),
            temperature=float(os.getenv("LITELLM_TEMPERATURE", "0.0")),
            timeout=int(os.getenv("LITELLM_TIMEOUT", "30")),
            enabled=_env_bool("LITELLM_ENABLED", True),
        )


def _first_json_obj(text: str) -> dict[str, Any] | None:
    """Extract the first JSON object from an LLM response string."""
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


class LLMClient:
    """
    Provider-agnostic LLM client backed by LiteLLM.

    Usage:
        client = LLMClient(LLMClientConfig.from_env())
        result = client.complete(messages=[{"role": "user", "content": "..."}])
        # result is a plain string (the model's reply)
    """

    def __init__(self, cfg: LLMClientConfig) -> None:
        self.cfg = cfg
        self._litellm_kwargs: dict[str, Any] = {}
        if cfg.api_key:
            self._litellm_kwargs["api_key"] = cfg.api_key
        if cfg.api_base:
            self._litellm_kwargs["api_base"] = cfg.api_base

    def complete(self, messages: list[dict[str, str]]) -> str:
        """
        Send messages to the LLM and return the response string.
        Raises RuntimeError if LLM is disabled.
        """
        if not self.cfg.enabled:
            raise RuntimeError("LLM is disabled (LITELLM_ENABLED=false)")

        try:
            import litellm
        except ImportError as e:
            raise ImportError(
                "litellm is not installed. "
                "Add 'litellm' to postprocess/pyproject.toml dependencies."
            ) from e

        resp = litellm.completion(
            model=self.cfg.model,
            messages=messages,
            max_tokens=self.cfg.max_tokens,
            temperature=self.cfg.temperature,
            timeout=self.cfg.timeout,
            **self._litellm_kwargs,
        )
        return resp.choices[0].message.content or ""

    def extract_json(self, messages: list[dict[str, str]]) -> dict[str, Any] | None:
        """
        Like complete() but parses the first JSON object from the response.
        Returns None if no JSON is found or LLM is disabled.
        """
        try:
            text = self.complete(messages)
        except Exception as e:
            log.warning("LLM call failed: %s", e)
            return None
        obj = _first_json_obj(text)
        if obj is None:
            log.warning("LLM returned no JSON object. Response: %s", text[:200])
        return obj
