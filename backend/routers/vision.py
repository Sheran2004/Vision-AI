from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
import base64
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class VisionChatRequest(BaseModel):
    question: str
    image_base64: str
    content_type: str

@router.post("/vision-chat")
async def vision_chat(req: VisionChatRequest):
    def generate():
        stream = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{req.content_type};base64,{req.image_base64}"
                        }
                    },
                    {
                        "type": "text",
                        "text": req.question
                    }
                ]
            }],
            stream=True,
            max_tokens=1024
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    return StreamingResponse(generate(), media_type="text/plain")