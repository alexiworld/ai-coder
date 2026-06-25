import os
from typing import Optional

from openai import OpenAI

MODEL = "openai/gpt-oss-120b"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def get_client() -> Optional[OpenAI]:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return None
    return OpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=api_key,
    )


def call_ai(
    messages: list[dict],
    response_format: Optional[dict] = None,
    *,
    client: Optional[OpenAI] = None,
) -> Optional[str]:
    if client is None:
        client = get_client()
    if client is None:
        return None

    kwargs: dict = {
        "model": MODEL,
        "messages": messages,
        "max_tokens": 1500,
    }
    if response_format:
        kwargs["response_format"] = response_format

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content
