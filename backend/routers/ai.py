from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.services.ai import call_ai, get_client
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["ai"])


class AITestRequest(BaseModel):
    prompt: str = "What is 2+2?"


class AITestResponse(BaseModel):
    response: str


@router.post("/test", response_model=AITestResponse)
def ai_test(
    request: AITestRequest,
    username: str = Depends(get_current_user),
):
    client = get_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env",
        )

    messages = [
        {"role": "system", "content": "You are a helpful assistant. Be concise."},
        {"role": "user", "content": request.prompt},
    ]

    result = call_ai(messages)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service call failed",
        )

    return AITestResponse(response=result)