from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
import base64
import io
import os
from PIL import Image
from ultralytics import YOLO

router = APIRouter()
model = YOLO("yolov8n.pt")  # auto download hoga pehli baar

@router.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    
    results = model(image)
    
    detections = []
    for result in results:
        for box in result.boxes:
            detections.append({
                "label": result.names[int(box.cls)],
                "confidence": round(float(box.conf) * 100, 1),
            })
    
    # Annotated image
    annotated = results[0].plot()
    annotated_img = Image.fromarray(annotated)
    buffer = io.BytesIO()
    annotated_img.save(buffer, format="JPEG")
    img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    
    return {
        "detections": detections,
        "annotated_image": f"data:image/jpeg;base64,{img_base64}"
    }