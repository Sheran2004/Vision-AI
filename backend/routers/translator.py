from fastapi import APIRouter
from fastapi.responses import JSONResponse
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
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": f"Translate the following text to {req.target_language}. Return only the translated text, nothing else:\n\n{req.text}"}]
        )
        return {"translated": response.choices[0].message.content}
    except Exception as e:
        error = str(e)
        if "429" in error or "rate_limit" in error.lower():
            return JSONResponse(status_code=429, content={"translated": "⚠️ Rate limit reached. Please wait 1-2 minutes and try again."})
        elif "503" in error or "capacity" in error.lower():
            return JSONResponse(status_code=503, content={"translated": "⚠️ AI server is busy. Please try again in a few seconds."})
        else:
            return JSONResponse(status_code=500, content={"translated": f"❌ Error: {error}"})