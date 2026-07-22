from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx
import base64
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class VideoRequest(BaseModel):
    prompt: str

@router.post("/generate-video")
async def generate_video(req: VideoRequest):
    try:
        hf_token = os.getenv("HF_API_KEY")
        url = "https://api-inference.huggingface.co/models/cerspense/zeroscope_v2_576w"
        
        async with httpx.AsyncClient(timeout=300) as client:
            res = await client.post(
                url,
                headers={"Authorization": f"Bearer {hf_token}"},
                json={"inputs": req.prompt}
            )
            
            if res.status_code == 200:
                video_base64 = base64.b64encode(res.content).decode("utf-8")
                return {"video": f"data:video/mp4;base64,{video_base64}"}
            elif res.status_code == 503:
                return JSONResponse(status_code=503, content={"error": "Model loading... please wait 30 seconds and try again."})
            else:
                return JSONResponse(status_code=500, content={"error": f"Error: {res.text[:200]}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})