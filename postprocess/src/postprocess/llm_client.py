"""
LLM client — thin wrapper over LiteLLM for provider-agnostic calls.

Why LiteLLM?
  litellm.completion() speaks a single OpenAI-compatible API regardless of
  whether you're hitting OpenRouter, Groq, Azure, a local Ollama, or any
  other provider.  Switching providers is a one-line env-var change.

Configuration (all via environment variables):
  LITELLM_MODEL          Model string.  Two modes:

    a) Direct provider (no LITELLM_API_BASE set):
         openrouter/meta-llama/llama-3.1-8b-instruct:free
         groq/llama-3.1-8b-instant
         ollama/llama3.2:3b

    b) Self-hosted LiteLLM proxy (LITELLM_API_BASE points to your proxy):
         Just the model name as your proxy knows it, e.g.:
           deepseek-v4-flash
           gpt-4o-mini
         The client will automatically prepend "openai/" so LiteLLM routes
         the request to your proxy's OpenAI-compatible endpoint instead of
         trying to hit the upstream provider directly.
         You can also write it explicitly: openai/deepseek-v4-flash

  LITELLM_API_KEY        API key forwarded to the proxy / provider.

  LITELLM_API_BASE       Base URL of a self-hosted LiteLLM proxy.
                         E.g. https://litellm-data.snappfood.dev
                         When set, the model is prefixed with "openai/" unless
                         it already starts with "openai/".

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
    max_tokens: int = 512
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
            max_tokens=int(os.getenv("LITELLM_MAX_TOKENS", "512")),
            temperature=float(os.getenv("LITELLM_TEMPERATURE", "0.0")),
            timeout=int(os.getenv("LITELLM_TIMEOUT", "30")),
            enabled=_env_bool("LITELLM_ENABLED", True),
        )


def _first_json_obj(text: str) -> dict[str, Any] | None:
    """
    Extract the first JSON object from an LLM response string.
    Handles truncated responses by trying to repair an incomplete JSON object
    (add missing closing brace) before giving up.
    """
    if not text or not text.strip():
        return None

    # Find the first opening brace
    start = text.find("{")
    if start == -1:
        return None

    chunk = text[start:]

    # Try parsing as-is first
    try:
        return json.loads(chunk)
    except Exception:
        pass

    # Try to find a complete object (last closing brace)
    end = chunk.rfind("}")
    if end != -1:
        try:
            return json.loads(chunk[: end + 1])
        except Exception:
            pass

    # Response was truncated mid-JSON — try to repair by closing open braces
    # Count unmatched braces and add the missing closing ones
    depth = 0
    in_string = False
    escape_next = False
    for ch in chunk:
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if not in_string:
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1

    if depth > 0:
        # Strip trailing incomplete key/value (find last complete comma-separated entry)
        # by trimming back to the last complete value boundary
        trimmed = chunk.rstrip().rstrip(",").rstrip()
        repaired = trimmed + ("}" * depth)
        try:
            return json.loads(repaired)
        except Exception:
            pass

    return None


def _effective_model(model: str, api_base: str | None) -> str:
    """
    When routing through a self-hosted LiteLLM proxy, the model must use the
    "openai/" prefix so LiteLLM sends the request to api_base using the
    OpenAI protocol instead of routing directly to the upstream provider.

    Rules:
    - If api_base is NOT set: return model unchanged (direct provider routing).
    - If api_base IS set and model already starts with "openai/": return as-is.
    - If api_base IS set and model has a different provider prefix (e.g.
      "deepseek/deepseek-v4-flash"), strip the prefix and prepend "openai/".
    - If api_base IS set and model has no prefix: just prepend "openai/".
    """
    if not api_base:
        return model

    if model.startswith("openai/"):
        return model

    # When using a self-hosted LiteLLM proxy the model name registered on the
    # proxy is used as-is (e.g. "deepseek/deepseek-v4-flash").  We must prefix
    # with "openai/" so the LiteLLM *client* library routes the request to
    # api_base using the OpenAI protocol instead of going to the upstream
    # provider directly.  The full original name is preserved.
    return f"openai/{model}"


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
        self._model = _effective_model(cfg.model, cfg.api_base)
        self._litellm_kwargs: dict[str, Any] = {}
        if cfg.api_key:
            self._litellm_kwargs["api_key"] = cfg.api_key
        if cfg.api_base:
            self._litellm_kwargs["api_base"] = cfg.api_base
        if self._model != cfg.model:
            log.info(
                "LiteLLM proxy mode: model %r → %r (api_base=%s)",
                cfg.model, self._model, cfg.api_base,
            )

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
            model=self._model,
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
