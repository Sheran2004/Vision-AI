from fastapi import APIRouter, UploadFile, File
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        transcription = client.audio.transcriptions.create(
            file=(file.filename, contents, file.content_type),
            model="whisper-large-v3",
            response_format="text"
        )
        return {"text": transcription}
    except Exception as e:
        error = str(e)
        if "429" in error:
            return {"text": "⚠️ Rate limit reached. Please wait and try again."}
        return {"text": f"❌ Error: {error}"}