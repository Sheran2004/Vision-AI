from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class ChatRequest(BaseModel):
    message: str
    history: list = []
    system_prompt: str = "You are VisionSync AI, a helpful multimodal AI assistant."

@router.post("/chat")
async def chat(req: ChatRequest):
    messages = [{"role": "system", "content": req.system_prompt}] + req.history + [{"role": "user", "content": req.message}]
    
    def generate():
        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            stream=True
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    return StreamingResponse(generate(), media_type="text/plain")