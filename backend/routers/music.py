from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx
import base64

router = APIRouter()

class MusicRequest(BaseModel):
    prompt: str

@router.post("/generate-music")
async def generate_music(req: MusicRequest):
    try:
        encoded = req.prompt.replace(" ", "%20")
        url = f"https://text.pollinations.ai/{encoded}"
        
        async with httpx.AsyncClient(timeout=60) as client:
            res = await client.get(url)
            if res.status_code == 200:
                audio_base64 = base64.b64encode(res.content).decode("utf-8")
                return {"audio": f"data:audio/mpeg;base64,{audio_base64}"}
            else:
                return JSONResponse(status_code=500, content={"error": "Generation failed"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})