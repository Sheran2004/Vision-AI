from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class SummarizeRequest(BaseModel):
    text: str
    length: str = "medium"

@router.post("/summarize")
async def summarize(req: SummarizeRequest):
    length_prompt = {
        "short": "in 2-3 sentences",
        "medium": "in a short paragraph with key points",
        "detailed": "in detail with headings and bullet points"
    }
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": f"Summarize the following text {length_prompt[req.length]}:\n\n{req.text}"}]
        )
        return {"summary": response.choices[0].message.content}
    except Exception as e:
        error = str(e)
        if "429" in error or "rate_limit" in error.lower():
            return JSONResponse(status_code=429, content={"summary": "⚠️ Rate limit reached. Please wait 1-2 minutes and try again."})
        elif "503" in error or "capacity" in error.lower():
            return JSONResponse(status_code=503, content={"summary": "⚠️ AI server is busy. Please try again in a few seconds."})
        else:
            return JSONResponse(status_code=500, content={"summary": f"❌ Error: {error}"})