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

class VideoRequest(BaseModel):
    prompt: str

@router.post("/generate-video")
async def generate_video(req: VideoRequest):
    try:
        output = replicate.run(
            "anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
            input={
                "prompt": req.prompt,
                "num_frames": 24,
                "fps": 8,
                "width": 576,
                "height": 320
            }
        )
        
        video_url = str(output[0]) if isinstance(output, list) else str(output)
        async with httpx.AsyncClient(timeout=120) as client:
            res = await client.get(video_url)
            if res.status_code == 200:
                video_base64 = base64.b64encode(res.content).decode("utf-8")
                return {"video": f"data:video/mp4;base64,{video_base64}"}
            else:
                return JSONResponse(status_code=500, content={"error": "Failed to fetch video"})
    except Exception as e:
        error = str(e)
        if "402" in error:
            return JSONResponse(status_code=402, content={"error": "⚠️ Replicate credits exhausted."})
        return JSONResponse(status_code=500, content={"error": error})