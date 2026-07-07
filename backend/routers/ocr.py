from fastapi import APIRouter, UploadFile, File
from groq import Groq
import os
import base64
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@router.post("/ocr")
async def ocr_scan(file: UploadFile = File(...)):
    contents = await file.read()
    base64_image = base64.b64encode(contents).decode("utf-8")
    
    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{file.content_type};base64,{base64_image}"
                        }
                    },
                    {
                        "type": "text",
                        "text": "Extract all text from this image. If no text found, describe what you see."
                    }
                ]
            }
        ],
        max_tokens=1024
    )
    
    return {"text": response.choices[0].message.content}