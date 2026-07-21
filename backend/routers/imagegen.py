from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx
import base64
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class ImageGenRequest(BaseModel):
    prompt: str

@router.post("/generate-image")
async def generate_image(req: ImageGenRequest):
    try:
        encoded_prompt = req.prompt.replace(" ", "%20")
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&nologo=true"
        
        async with httpx.AsyncClient(timeout=60) as client:
            res = await client.get(url)
            
            if res.status_code == 200:
                img_base64 = base64.b64encode(res.content).decode("utf-8")
                return {"image": f"data:image/jpeg;base64,{img_base64}"}
            else:
                return JSONResponse(status_code=500, content={"error": f"Error: {res.status_code}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})