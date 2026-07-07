from fastapi import APIRouter
from pydantic import BaseModel
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class SummarizeRequest(BaseModel):
    text: str
    length: str = "medium"  # short, medium, detailed

@router.post("/summarize")
async def summarize(req: SummarizeRequest):
    length_prompt = {
        "short": "in 2-3 sentences",
        "medium": "in a short paragraph with key points",
        "detailed": "in detail with headings and bullet points"
    }
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{
            "role": "user",
            "content": f"Summarize the following text {length_prompt[req.length]}:\n\n{req.text}"
        }]
    )
    return {"summary": response.choices[0].message.content}