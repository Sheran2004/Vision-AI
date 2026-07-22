from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx
import base64
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class MusicRequest(BaseModel):
    prompt: str
    duration: int = 8

@router.post("/generate-music")
async def generate_music(req: MusicRequest):
    try:
        hf_token = os.getenv("HF_API_KEY")
        url = "https://api-inference.huggingface.co/models/facebook/musicgen-small"
        
        async with httpx.AsyncClient(timeout=120) as client:
            res = await client.post(
                url,
                headers={"Authorization": f"Bearer {hf_token}"},
                json={
                    "inputs": req.prompt,
                    "parameters": {"max_new_tokens": req.duration * 50}
                }
            )
            
            if res.status_code == 200:
                audio_base64 = base64.b64encode(res.content).decode("utf-8")
                return {"audio": f"data:audio/wav;base64,{audio_base64}"}
            elif res.status_code == 503:
                return JSONResponse(status_code=503, content={"error": "Model loading... please wait 20 seconds and try again."})
            else:
                return JSONResponse(status_code=500, content={"error": f"Error: {res.text[:200]}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})