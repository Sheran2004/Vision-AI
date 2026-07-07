from fastapi import APIRouter
from pydantic import BaseModel
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class TranslateRequest(BaseModel):
    text: str
    target_language: str

@router.post("/translate")
async def translate(req: TranslateRequest):
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{
            "role": "user",
            "content": f"Translate the following text to {req.target_language}. Return only the translated text, nothing else:\n\n{req.text}"
        }]
    )
    return {"translated": response.choices[0].message.content}