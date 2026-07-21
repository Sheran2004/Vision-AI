from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx
import base64
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class ImageGenRequest(BaseModel):
    prompt: str

@router.post("/generate-image")
async def generate_image(req: ImageGenRequest):
    try:
        hf_token = os.getenv("HF_API_KEY")
        url = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"
        
        async with httpx.AsyncClient(timeout=60) as client:
            res = await client.post(
                url,
                headers={"Authorization": f"Bearer {hf_token}"},
                json={"inputs": req.prompt}
            )
            
            if res.status_code == 200:
                img_base64 = base64.b64encode(res.content).decode("utf-8")
                return {"image": f"data:image/jpeg;base64,{img_base64}"}
            else:
                return JSONResponse(status_code=500, content={"error": f"Failed: {res.text}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})