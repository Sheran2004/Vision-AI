from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, ocr, summarizer, translator, detection, pdf_chat, vision, search
from routers import chat, ocr, summarizer, translator, detection, pdf_chat, vision, search, news


app = FastAPI(title="VisionSync AI", version="1.0.0")
import threading
import time
import urllib.request

def keep_alive():
    while True:
        time.sleep(840)  # 14 minutes
        try:
            urllib.request.urlopen("https://visionsync-backend.onrender.com")
        except:
            pass

threading.Thread(target=keep_alive, daemon=True).start()
app.include_router(vision.router, prefix="/api")
app.include_router(pdf_chat.router, prefix="/api")
app.include_router(detection.router, prefix="/api")
app.include_router(translator.router, prefix="/api")
app.include_router(summarizer.router, prefix="/api")
app.include_router(ocr.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(news.router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://visionsync-frontend-two.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "VisionSync AI Backend Running 🚀"}