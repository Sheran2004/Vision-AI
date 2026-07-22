from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import replicate
import httpx
import base64
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
os.environ["REPLICATE_API_TOKEN"] = os.getenv("REPLICATE_API_TOKEN", "")

class MusicRequest(BaseModel):
    prompt: str
    duration: int = 8

@router.post("/generate-music")
async def generate_music(req: MusicRequest):
    try:
        output = replicate.run(
            "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043399421d6d8962a4eff0aff8f2",
            input={
                "prompt": req.prompt,
                "duration": req.duration,
                "model_version": "stereo-large",
                "output_format": "mp3"
            }
        )
        
        audio_url = str(output)
        async with httpx.AsyncClient(timeout=60) as client:
            res = await client.get(audio_url)
            if res.status_code == 200:
                audio_base64 = base64.b64encode(res.content).decode("utf-8")
                return {"audio": f"data:audio/mp3;base64,{audio_base64}"}
            else:
                return JSONResponse(status_code=500, content={"error": "Failed to fetch audio"})
    except Exception as e:
        error = str(e)
        if "402" in error:
            return JSONResponse(status_code=402, content={"error": "⚠️ Replicate credits exhausted. Please add credits."})
        return JSONResponse(status_code=500, content={"error": error})