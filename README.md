# 🧠 VisionSync AI
### An On-Device Multimodal AI Assistant Powered by Snapdragon AI

![VisionSync AI](https://img.shields.io/badge/AI-Multimodal-violet)
![Groq](https://img.shields.io/badge/Powered%20by-Groq-orange)
![YOLOv8](https://img.shields.io/badge/Object%20Detection-YOLOv8-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-cyan)

---

## ✨ Features

| Feature | Description | Technology |
|--------|-------------|------------|
| 💬 AI Chat | Intelligent conversational AI | Llama 3.3 70B via Groq |
| 🎤 Voice Input | Speech to text input | Web Speech API |
| 📷 OCR Scanner | Extract text from images | Llama 4 Vision via Groq |
| 📄 Summarizer | Summarize long texts | Llama 3.3 70B via Groq |
| 🌐 Translator | Translate to 15+ languages | Llama 3.3 70B via Groq |
| 🎯 Object Detection | Detect objects in images | YOLOv8 |

---

## 🛠️ Tech Stack

**Frontend**
- React + Vite + TypeScript
- Tailwind CSS

**Backend**
- FastAPI (Python)
- Groq API (Llama Models)
- YOLOv8 (Ultralytics)

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Groq API Key (free at console.groq.com)

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn groq python-dotenv python-multipart pillow ultralytics
```

Create `.env` file in backend folder:
GROQ_API_KEY=your_groq_api_key_here

Run backend:
```bash
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## 📁 Project Structure

VisionSync-AI/
├── backend/
│   ├── routers/
│   │   ├── chat.py
│   │   ├── ocr.py
│   │   ├── summarizer.py
│   │   ├── translator.py
│   │   └── detection.py
│   ├── main.py
│   └── .env
├── frontend/
│   ├── src/
│   │   └── App.tsx
│   └── ...
└── README.md

---

## 🏆 Built For
**Qualcomm Snapdragon AI Hackathon**

---

## 👨‍💻 Developer
**Mohammad Sheran Asgar**
- GitHub: [@Sheran2004](https://github.com/Sheran2004)