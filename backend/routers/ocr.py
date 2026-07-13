from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from groq import Groq
import os
import base64
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@router.post("/ocr")
async def ocr_scan(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode("utf-8")
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:{file.content_type};base64,{base64_image}"}},
                    {"type": "text", "text": "Extract all text from this image. If no text found, describe what you see."}
                ]
            }],
            max_tokens=1024
        )
        return {"text": response.choices[0].message.content}
    except Exception as e:
        error = str(e)
        if "429" in error or "rate_limit" in error.lower():
            return JSONResponse(status_code=429, content={"text": "⚠️ Rate limit reached. Please wait 1-2 minutes and try again."})
        elif "503" in error or "capacity" in error.lower():
            return JSONResponse(status_code=503, content={"text": "⚠️ AI Vision server is busy. Please try again in a few seconds."})
        else:
            return JSONResponse(status_code=500, content={"text": f"❌ OCR Error: {error}"})