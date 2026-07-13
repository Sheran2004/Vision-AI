from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat
from routers import chat, ocr
from routers import chat, ocr, summarizer
from routers import chat, ocr, summarizer, translator
from routers import chat, ocr, summarizer, translator, detection
from routers import chat, ocr, summarizer, translator, detection, pdf_chat
from routers import chat, ocr, summarizer, translator, detection, pdf_chat, vision

app = FastAPI(title="VisionSync AI", version="1.0.0")
app.include_router(vision.router, prefix="/api")
app.include_router(pdf_chat.router, prefix="/api")
app.include_router(detection.router, prefix="/api")
app.include_router(translator.router, prefix="/api")
app.include_router(summarizer.router, prefix="/api")
app.include_router(ocr.router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "VisionSync AI Backend Running 🚀"}