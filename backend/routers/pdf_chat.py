from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
import PyPDF2
import io
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class PDFChatRequest(BaseModel):
    question: str
    pdf_text: str

@router.post("/pdf-upload")
async def upload_pdf(file: UploadFile = File(...)):
    contents = await file.read()
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(contents))
    
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() + "\n"
    
    return {"text": text[:10000], "pages": len(pdf_reader.pages)}

@router.post("/pdf-chat")
async def pdf_chat(req: PDFChatRequest):
    def generate():
        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f"You are a helpful assistant. Answer questions based on this document:\n\n{req.pdf_text[:8000]}"
                },
                {
                    "role": "user",
                    "content": req.question
                }
            ],
            stream=True
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    return StreamingResponse(generate(), media_type="text/plain")