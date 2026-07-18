import { useState, useRef, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  temporary: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const LANGUAGES = [
  "Hindi", "Spanish", "French", "German", "Arabic",
  "Chinese", "Japanese", "Korean", "Portuguese", "Russian",
  "Italian", "Bengali", "Urdu", "Tamil", "Telugu"
];

function renderMarkdown(text: string) {
  let html = text;
  html = html.replace(/\*\*(.+?)\*\*/gs, '<strong style="font-weight:700">$1</strong>');
  html = html.replace(/\*(.+?)\*/gs, '<em>$1</em>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:1rem;font-weight:700;margin:12px 0 4px">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:1.1rem;font-weight:700;margin:12px 0 4px">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:1.2rem;font-weight:700;margin:12px 0 4px">$1</h1>');
  html = html.replace(/^[-=]{3,}$/gm, '<hr style="border-color:#4b5563;margin:8px 0"/>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

function MessageContent({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  
  const copyAll = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="relative group">
      <button
        onClick={copyAll}
        className="absolute -top-2 -right-2 hidden group-hover:flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 px-2 py-1 rounded-lg transition-colors z-10"
      >
        {copied ? "✅ Copied!" : "📋 Copy"}
      </button>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          const lang = match?.[1] || "text";
          const code = match?.[2] || "";
          return (
            <div key={i} className="relative my-2">
              <div className="flex items-center justify-between bg-gray-800 px-3 py-1 rounded-t-lg">
                <span className="text-xs text-gray-400">{lang}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(code).then(() => {
                      (e.target as HTMLButtonElement).textContent = "✅ Copied!";
                      setTimeout(() => { (e.target as HTMLButtonElement).textContent = "📋 Copy"; }, 2000);
                    });
                  }}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  📋 Copy
                </button>
              </div>
              <SyntaxHighlighter language={lang} style={oneDark} customStyle={{ margin: 0, borderRadius: "0 0 8px 8px", fontSize: "13px" }}>{code}</SyntaxHighlighter>
            </div>
          );
        }
        let html = part;
        html = html.replace(/\*\*(.+?)\*\*/gs, '<strong style="font-weight:700">$1</strong>');
        html = html.replace(/\*(.+?)\*/gs, '<em>$1</em>');
        html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:1rem;font-weight:700;margin:12px 0 4px">$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:1.1rem;font-weight:700;margin:12px 0 4px">$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:1.2rem;font-weight:700;margin:12px 0 4px">$1</h1>');
        html = html.replace(/^[-=]{3,}$/gm, '<hr style="border-color:#4b5563;margin:8px 0"/>');
        html = html.replace(/\n/g, '<br/>');
        return <div key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "ocr" | "summarizer" | "translator" | "detection" | "pdf" | "vision">("chat");
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [summaryResult, setSummaryResult] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryLength, setSummaryLength] = useState("medium");
  const [translateText, setTranslateText] = useState("");
  const [translateResult, setTranslateResult] = useState("");
  const [translateLoading, setTranslateLoading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("Hindi");
  const [detectResult, setDetectResult] = useState<{label: string; confidence: number}[]>([]);
  const [detectAnnotated, setDetectAnnotated] = useState<string | null>(null);
  const [detectLoading, setDetectLoading] = useState(false);
  const [visionImage, setVisionImage] = useState<string | null>(null);
  const [visionImageB64, setVisionImageB64] = useState<string>("");
  const [visionContentType, setVisionContentType] = useState<string>("");
  const [visionMessages, setVisionMessages] = useState<Message[]>([]);
  const [visionInput, setVisionInput] = useState("");
  const [visionLoading, setVisionLoading] = useState(false);
  const visionBottomRef = useRef<HTMLDivElement>(null);
  const [pdfText, setPdfText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfPages, setPdfPages] = useState(0);
  const [pdfMessages, setPdfMessages] = useState<Message[]>([]);
  const [pdfInput, setPdfInput] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pdfBottomRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState("You are VisionSync AI, a helpful multimodal AI assistant.");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [tempSystemPrompt, setTempSystemPrompt] = useState(systemPrompt);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"ocr" | "vision" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
  const saved = localStorage.getItem("visionsync-sessions");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [isTemporary, setIsTemporary] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    visionBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visionMessages]);

  useEffect(() => {
    pdfBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pdfMessages]);

  useEffect(() => {
    if (!isTemporary) {
      localStorage.setItem("visionsync-sessions", JSON.stringify(sessions));
    }
  }, [sessions, isTemporary]);

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Use Chrome for Voice Input."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => setInput(event.results[0][0].transcript);
    recognition.onerror = (event: any) => { setIsListening(false); if (event.error === "no-speech") return; alert("Error: " + event.error); };
    recognition.start();
  };

  const openCamera = (target: "ocr" | "vision") => {
  setCameraTarget(target);
  setShowCamera(true);
  setTimeout(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      alert("Camera access denied. Please allow camera permission.");
      setShowCamera(false);
    }
  }, 100);
};

const capturePhoto = () => {
  if (!videoRef.current || !canvasRef.current) return;
  const video = videoRef.current;
  const canvas = canvasRef.current;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")?.drawImage(video, 0, 0);
  
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
    
    // Stop camera
    const stream = video.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setShowCamera(false);

    if (cameraTarget === "ocr") {
      setOcrImage(URL.createObjectURL(blob));
      setOcrResult(""); setOcrLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("https://visionsync-backend.onrender.com/api/ocr", { method: "POST", body: formData });
        const data = await res.json();
        setOcrResult(data.text);
      } catch { setOcrResult("❌ Error: OCR failed."); }
      finally { setOcrLoading(false); setActiveTab("ocr"); }
    } else if (cameraTarget === "vision") {
      setVisionImage(URL.createObjectURL(blob));
      setVisionContentType("image/jpeg");
      setVisionMessages([]);
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(",")[1];
        setVisionImageB64(b64);
      };
      reader.readAsDataURL(file);
      setActiveTab("vision");
    }
  }, "image/jpeg", 0.9);
};

const closeCamera = () => {
  if (videoRef.current) {
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
  }
  setShowCamera(false);
};

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrImage(URL.createObjectURL(file));
    setOcrResult(""); setOcrLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("https://visionsync-backend.onrender.com/api/ocr", { method: "POST", body: formData });
      const data = await res.json();
      setOcrResult(data.text);
    } catch { setOcrResult("❌ Error: OCR failed."); }
    finally { setOcrLoading(false); }
  };

  const handleSummarize = async () => {
    if (!summaryText.trim()) return;
    setSummaryResult(""); setSummaryLoading(true);
    try {
      const res = await fetch("https://visionsync-backend.onrender.com/api/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: summaryText, length: summaryLength }) });
      const data = await res.json();
      setSummaryResult(data.summary);
    } catch { setSummaryResult("❌ Error: Summarizer failed."); }
    finally { setSummaryLoading(false); }
  };

  const handleTranslate = async () => {
    if (!translateText.trim()) return;
    setTranslateResult(""); setTranslateLoading(true);
    try {
      const res = await fetch("https://visionsync-backend.onrender.com/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: translateText, target_language: targetLanguage }) });
      const data = await res.json();
      setTranslateResult(data.translated);
    } catch { setTranslateResult("❌ Error: Translation failed."); }
    finally { setTranslateLoading(false); }
  };

  const handleDetection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDetectResult([]); setDetectAnnotated(null); setDetectLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("https://visionsync-backend.onrender.com/api/detect", { method: "POST", body: formData });
      const data = await res.json();
      setDetectResult(data.detections);
      setDetectAnnotated(data.annotated_image);
    } catch { alert("❌ Error: Object Detection failed."); }
    finally { setDetectLoading(false); }
  };

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfName(file.name);
    setPdfText(""); setPdfMessages([]); setPdfUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("https://visionsync-backend.onrender.com/api/pdf-upload", { method: "POST", body: formData });
      const data = await res.json();
      setPdfText(data.text);
      setPdfPages(data.pages);
    } catch { alert("❌ Error: PDF upload failed."); }
    finally { setPdfUploading(false); }
  };

  const handlePDFChat = async () => {
    if (!pdfInput.trim() || !pdfText) return;
    const userMsg: Message = { role: "user", content: pdfInput };
    setPdfMessages((prev) => [...prev, userMsg]);
    const currentInput = pdfInput;
    setPdfInput(""); setPdfLoading(true);
    try {
      const res = await fetch("https://visionsync-backend.onrender.com/api/pdf-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentInput, pdf_text: pdfText }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      setPdfMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value);
        setPdfMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: aiText };
          return updated;
        });
      }
    } catch { setPdfMessages((prev) => [...prev, { role: "assistant", content: "❌ Error: PDF chat failed." }]); }
    finally { setPdfLoading(false); }
  };

  const handleVisionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setVisionImage(URL.createObjectURL(file));
  setVisionContentType(file.type);
  setVisionMessages([]);
  const reader = new FileReader();
  reader.onload = () => {
    const b64 = (reader.result as string).split(",")[1];
    setVisionImageB64(b64);
  };
  reader.readAsDataURL(file);
};

const handleVisionChat = async () => {
  if (!visionInput.trim() || !visionImageB64) return;
  const userMsg: Message = { role: "user", content: visionInput };
  setVisionMessages((prev) => [...prev, userMsg]);
  const currentInput = visionInput;
  setVisionInput(""); setVisionLoading(true);
  try {
    const res = await fetch("https://visionsync-backend.onrender.com/api/vision-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: currentInput, image_base64: visionImageB64, content_type: visionContentType }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let aiText = "";
    setVisionMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      aiText += decoder.decode(value);
      setVisionMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: aiText };
        return updated;
      });
    }
  } catch { setVisionMessages((prev) => [...prev, { role: "assistant", content: "❌ Error: Vision chat failed." }]); }
  finally { setVisionLoading(false); }
};

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput(""); setLoading(true);
    try {
      const res = await fetch("https://visionsync-backend.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput, history: messages.map((m) => ({ role: m.role, content: m.content })), system_prompt: systemPrompt }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value);
        setMessages((prev) => { const updated = [...prev]; updated[updated.length - 1] = { role: "assistant", content: aiText }; return updated; });
      }
    } catch { setMessages((prev) => [...prev, { role: "assistant", content: "❌ Error: Backend se connect nahi ho paya." }]); }
    finally { setLoading(false); }
    setTimeout(() => saveCurrentSession(), 500);
  };

  const createNewChat = () => {
  if (messages.length > 0 && !isTemporary && currentSessionId === "") {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: messages[0].content.slice(0, 40) + "...",
      messages: messages,
      createdAt: Date.now(),
      temporary: false,
    };
    setSessions((prev) => [newSession, ...prev]);
  }
  setMessages([]);
  setCurrentSessionId("");
  setInput("");
};

const loadSession = (session: ChatSession) => {
  setMessages(session.messages);
  setCurrentSessionId(session.id);
  setActiveTab("chat");
};

const deleteSession = (id: string) => {
  setSessions((prev) => prev.filter((s) => s.id !== id));
};

const saveCurrentSession = () => {
  if (messages.length === 0 || isTemporary) return;
  if (currentSessionId) {
    setSessions((prev) => prev.map((s) => s.id === currentSessionId ? { ...s, messages } : s));
  } else {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: messages[0].content.slice(0, 40) + "...",
      messages,
      createdAt: Date.now(),
      temporary: false,
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  }
};

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handlePDFKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePDFChat(); } };

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      {showSystemPrompt && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg mx-4">
      <h2 className="text-lg font-semibold mb-2">⚙️ System Prompt</h2>
      <p className="text-xs text-gray-500 mb-4">AI ka behavior customize karo</p>
      <textarea
        value={tempSystemPrompt}
        onChange={(e) => setTempSystemPrompt(e.target.value)}
        rows={6}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-violet-500 text-gray-200"
      />
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => { setSystemPrompt(tempSystemPrompt); setShowSystemPrompt(false); setMessages([]); }}
          className="flex-1 bg-violet-600 hover:bg-violet-500 py-2 rounded-lg text-sm transition-colors"
        >
          ✅ Save & Reset Chat
        </button>
        <button
          onClick={() => setShowSystemPrompt(false)}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { label: "🤖 Default", prompt: "You are VisionSync AI, a helpful multimodal AI assistant." },
          { label: "👨‍💻 Coder", prompt: "You are an expert programmer. Always provide clean, well-commented code with explanations." },
          { label: "🎓 Teacher", prompt: "You are a patient teacher. Explain concepts step by step in simple language." },
          { label: "✍️ Writer", prompt: "You are a creative writer. Help with writing, editing, and storytelling." },
        ].map((p) => (
          <button key={p.label} onClick={() => setTempSystemPrompt(p.prompt)} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition-colors">
            {p.label}
          </button>
        ))}
      </div>
    </div>
  </div>
)}

{showCamera && (
  <div className="fixed inset-0 bg-black z-50 flex flex-col">
    <div className="flex items-center justify-between p-4">
      <span className="text-white font-medium">📸 Camera</span>
      <button onClick={closeCamera} className="text-white text-2xl">✕</button>
    </div>
    <video ref={videoRef} className="flex-1 object-cover w-full" autoPlay playsInline muted />
    <canvas ref={canvasRef} className="hidden" />
    <div className="p-6 flex justify-center">
      <button
        onClick={capturePhoto}
        className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:bg-gray-100 transition-colors"
      />
    </div>
  </div>
)}

      <div className={`fixed z-40 h-full flex flex-col p-4 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} w-72 ${isDark ? "bg-gray-900 border-r border-gray-800" : "bg-white border-r border-gray-200"}`}>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm font-bold">V</div>
          <span className="font-bold text-lg">VisionSync AI</span>
        </div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => setActiveTab("chat")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${activeTab === "chat" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>💬 AI Chat</button>
          <button onClick={() => setActiveTab("pdf")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "pdf" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>📑 PDF Chat</button>
          <button onClick={() => setActiveTab("ocr")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "ocr" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>📷 OCR Scanner</button>
          <button onClick={() => setActiveTab("summarizer")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "summarizer" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>📄 Summarizer</button>
          <button onClick={() => setActiveTab("translator")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "translator" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>🌐 Translator</button>
          <button onClick={() => setActiveTab("detection")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "detection" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>🎯 Object Detection</button>
          <button onClick={() => setActiveTab("vision")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "vision" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>
  🖼️ Vision Chat
</button>
        </nav>
        <div className="mt-4 flex-1 overflow-y-auto">
  {sessions.length > 0 && (
    <div>
      <p className="text-xs text-gray-600 px-3 mb-2 uppercase tracking-wider">History</p>
      {sessions.map((s) => (
        <div key={s.id} className="group flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-800 cursor-pointer mb-1" onClick={() => loadSession(s)}>
          <span className="text-xs text-gray-400 truncate flex-1">💬 {s.title}</span>
          <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} className="text-gray-600 hover:text-red-400 text-xs px-1 flex-shrink-0">✕</button>
        </div>
      ))}
    </div>
  )}
</div>

<div className="border-t border-gray-800 pt-3 mt-2">
  <button onClick={createNewChat} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-400 text-sm mb-2">
    🗑️ New Chat
  </button>
  <p className="text-xs text-gray-600 text-center">Powered by Snapdragon AI</p>
</div>
      </div>
        {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
              )}
      <div className="flex-1 flex flex-col">
        <div className={`border-b px-6 py-4 flex items-center justify-between ${isDark ? "border-gray-800" : "border-gray-200 bg-white"}`}>
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden mr-3 text-gray-400 hover:text-white text-2xl">
              ☰
            </button>
          </div>
          <div>
            <h1 className="font-semibold text-lg">
              {activeTab === "chat" ? "AI Chat" : activeTab === "pdf" ? "PDF Chat" : activeTab === "ocr" ? "OCR Scanner" : activeTab === "summarizer" ? "Text Summarizer" : activeTab === "translator" ? "Translator" : activeTab === "vision" ? "Vision Chat" : "Object Detection"}
            </h1>
            <p className="text-xs text-gray-500">{activeTab === "detection" ? "Powered by YOLOv8" : "Powered by Llama via Groq" }</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setIsTemporary(!isTemporary); setMessages([]); setCurrentSessionId(""); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${isTemporary ? "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
            >
              ⚡ {isTemporary ? "Temporary ON" : "Temporary"}
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className="px-3 py-1.5 rounded-lg text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
            <button
              onClick={() => { setTempSystemPrompt(systemPrompt); setShowSystemPrompt(true); }}
              className="px-3 py-1.5 rounded-lg text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              ⚙️ System
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-400">Online</span>
            </div>
          </div>
        </div>

        {activeTab === "pdf" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {!pdfText ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <div className="w-full max-w-2xl">
                  <h2 className="text-xl font-semibold mb-2">📑 PDF Chat</h2>
                  <p className="text-gray-500 text-sm mb-6">Upload a PDF and chat with it using AI</p>
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:border-violet-500 transition-colors bg-gray-900">
                    <div className="text-4xl mb-2">📄</div>
                    <p className="text-gray-400 text-sm">Click to upload PDF</p>
                    <p className="text-gray-600 text-xs mt-1">PDF files only</p>
                    <input type="file" accept=".pdf" className="hidden" onChange={handlePDFUpload} />
                  </label>
                  {pdfUploading && (
                    <div className="mt-6 flex items-center gap-3 text-violet-400">
                      <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Processing PDF...</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="bg-gray-900 border-b border-gray-800 px-6 py-2 flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="text-sm font-medium">{pdfName}</p>
                    <p className="text-xs text-gray-500">{pdfPages} pages loaded</p>
                  </div>
                  <button onClick={() => { setPdfText(""); setPdfName(""); setPdfMessages([]); }} className="ml-auto text-xs text-gray-500 hover:text-red-400">✕ Remove</button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                  {pdfMessages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 mt-20">
                      <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center text-3xl">📑</div>
                      <h2 className="text-xl font-semibold">PDF Ready!</h2>
                      <p className="text-gray-500 text-sm">Ask anything about your document</p>
                      <div className="grid grid-cols-2 gap-3 mt-4 w-full max-w-md">
                        {["Summarize this document", "What are the key points?", "Explain the main topic", "List important facts"].map((s) => (
                          <button key={s} onClick={() => setPdfInput(s)} className="text-left px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-violet-500 text-sm text-gray-400 hover:text-white transition-all">{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {pdfMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm flex-shrink-0">V</div>}
                      <div className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-violet-600 text-white rounded-br-sm" : "bg-gray-900 text-gray-200 rounded-bl-sm border border-gray-800"}`}>
                        <MessageContent content={msg.content} />
                      </div>
                    </div>
                  ))}
                  {pdfLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm">V</div>
                      <div className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={pdfBottomRef} />
                </div>
                <div className={`border-t px-6 py-4 ${isDark ? "border-gray-800" : "border-gray-200 bg-white"}`}>
                  <div className="flex gap-3 items-end">
                    <textarea value={pdfInput} onChange={(e) => setPdfInput(e.target.value)} onKeyDown={handlePDFKey} placeholder="Ask about your PDF..." rows={1} className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600" />
                    <button onClick={handlePDFChat} disabled={pdfLoading || !pdfInput.trim()} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 rounded-xl transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        ) : activeTab === "ocr" ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6 overflow-y-auto">
            <div className="w-full max-w-2xl">
              <h2 className="text-xl font-semibold mb-2">📷 OCR Scanner</h2>
              <p className="text-gray-500 text-sm mb-6">Upload an image to extract text using AI Vision</p>
              <button
                onClick={() => openCamera("ocr")}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-2xl py-4 text-gray-400 text-sm transition-colors"
              >
                📸 Use Camera
              </button>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:border-violet-500 transition-colors bg-gray-900">
                <div className="text-4xl mb-2">📁</div>
                <p className="text-gray-400 text-sm">Click to upload image</p>
                <p className="text-gray-600 text-xs mt-1">PNG, JPG, JPEG supported</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleOCR} />
              </label>
              {ocrImage && <div className="mt-6"><img src={ocrImage} alt="Uploaded" className="w-full max-h-64 object-contain rounded-xl border border-gray-800" /></div>}
              {ocrLoading && <div className="mt-6 flex items-center gap-3 text-violet-400"><div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div><span className="text-sm">Extracting text...</span></div>}
              {ocrResult && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Extracted Text:</h3>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(ocrResult) }} />
                  <button onClick={() => { setInput(ocrResult); setActiveTab("chat"); }} className="mt-3 bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm transition-colors">💬 Send to AI Chat</button>
                </div>
              )}
            </div>
          </div>

        ) : activeTab === "summarizer" ? (
          <div className="flex-1 flex flex-col items-center justify-start px-6 py-8 overflow-y-auto">
            <div className="w-full max-w-2xl">
              <h2 className="text-xl font-semibold mb-2">📄 Text Summarizer</h2>
              <p className="text-gray-500 text-sm mb-6">Paste any text and get an AI-powered summary</p>
              <textarea value={summaryText} onChange={(e) => setSummaryText(e.target.value)} placeholder="Paste your text here..." rows={8} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600" />
              <div className="flex gap-3 mt-4 items-center">
                <span className="text-sm text-gray-400">Summary Length:</span>
                {["short", "medium", "detailed"].map((l) => (
                  <button key={l} onClick={() => setSummaryLength(l)} className={`px-3 py-1 rounded-lg text-xs capitalize ${summaryLength === l ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{l}</button>
                ))}
              </div>
              <button onClick={handleSummarize} disabled={summaryLoading || !summaryText.trim()} className="mt-4 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors">{summaryLoading ? "Summarizing..." : "✨ Summarize"}</button>
              {summaryResult && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Summary:</h3>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(summaryResult) }} />
                  <button onClick={() => { setInput(summaryResult); setActiveTab("chat"); }} className="mt-3 bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm transition-colors">💬 Send to AI Chat</button>
                </div>
              )}
            </div>
          </div>

        ) : activeTab === "translator" ? (
          <div className="flex-1 flex flex-col items-center justify-start px-6 py-8 overflow-y-auto">
            <div className="w-full max-w-2xl">
              <h2 className="text-xl font-semibold mb-2">🌐 Translator</h2>
              <p className="text-gray-500 text-sm mb-6">Translate text into 15+ languages instantly</p>
              <textarea value={translateText} onChange={(e) => setTranslateText(e.target.value)} placeholder="Enter text to translate..." rows={6} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600" />
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Translate to:</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button key={lang} onClick={() => setTargetLanguage(lang)} className={`px-3 py-1 rounded-lg text-xs ${targetLanguage === lang ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{lang}</button>
                  ))}
                </div>
              </div>
              <button onClick={handleTranslate} disabled={translateLoading || !translateText.trim()} className="mt-4 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors">{translateLoading ? "Translating..." : "🌐 Translate"}</button>
              {translateResult && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Translation ({targetLanguage}):</h3>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-200 leading-relaxed">{translateResult}</div>
                  <button onClick={() => { setInput(translateResult); setActiveTab("chat"); }} className="mt-3 bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm transition-colors">💬 Send to AI Chat</button>
                </div>
              )}
            </div>
          </div>

        ) : activeTab === "detection" ? (
          <div className="flex-1 flex flex-col items-center justify-start px-6 py-8 overflow-y-auto">
            <div className="w-full max-w-2xl">
              <h2 className="text-xl font-semibold mb-2">🎯 Object Detection</h2>
              <p className="text-gray-500 text-sm mb-6">Upload an image to detect objects using YOLOv8</p>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:border-violet-500 transition-colors bg-gray-900">
                <div className="text-4xl mb-2">📁</div>
                <p className="text-gray-400 text-sm">Click to upload image</p>
                <p className="text-gray-600 text-xs mt-1">PNG, JPG, JPEG supported</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleDetection} />
              </label>
              {detectLoading && <div className="mt-6 flex items-center gap-3 text-violet-400"><div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div><span className="text-sm">Detecting objects...</span></div>}
              {detectAnnotated && <div className="mt-6"><h3 className="text-sm font-semibold text-gray-400 mb-2">Detected Objects:</h3><img src={detectAnnotated} alt="Annotated" className="w-full rounded-xl border border-gray-800" /></div>}
              {detectResult.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Detection Results:</h3>
                  <div className="flex flex-wrap gap-2">
                    {detectResult.map((d, i) => (
                      <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm">
                        <span className="text-violet-400 font-medium">{d.label}</span>
                        <span className="text-gray-500 ml-2">{d.confidence}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        ) : activeTab === "vision" ? 
  <div className="flex-1 flex flex-col overflow-hidden">
    {!visionImage ? (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          <h2 className="text-xl font-semibold mb-2">🖼️ Vision Chat</h2>
          <p className="text-gray-500 text-sm mb-6">Upload an image and ask AI anything about it</p>
          <button
            onClick={() => openCamera("vision")}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-2xl py-4 text-gray-400 text-sm transition-colors"
          >
            📸 Use Camera
          </button>
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:border-violet-500 transition-colors bg-gray-900">
            <div className="text-4xl mb-2">🖼️</div>
            <p className="text-gray-400 text-sm">Click to upload image</p>
            <p className="text-gray-600 text-xs mt-1">PNG, JPG, JPEG supported</p>
            <input type="file" accept="image/*" className="hidden" onChange={handleVisionUpload} />
          </label>
        </div>
      </div>
    ) : (
      <>
        <div className="border-b border-gray-800 px-6 py-2 flex items-center gap-3">
          <img src={visionImage} className="w-12 h-12 rounded-lg object-cover border border-gray-700" />
          <p className="text-sm text-gray-400">Image loaded — ask anything!</p>
          <button onClick={() => { setVisionImage(null); setVisionImageB64(""); setVisionMessages([]); }} className="ml-auto text-xs text-gray-500 hover:text-red-400">✕ Remove</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {visionMessages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 mt-20">
              <p className="text-gray-500 text-sm">Ask anything about the image!</p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                {["What is in this image?", "Describe this image", "What text is visible?", "What colors are dominant?"].map((s) => (
                  <button key={s} onClick={() => setVisionInput(s)} className="text-left px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-violet-500 text-sm text-gray-400 hover:text-white transition-all">{s}</button>
                ))}
              </div>
            </div>
          )}
          {visionMessages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm flex-shrink-0">V</div>}
              <div className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-violet-600 text-white rounded-br-sm" : "bg-gray-900 text-gray-200 rounded-bl-sm border border-gray-800"}`}>
                <MessageContent content={msg.content} />
              </div>
            </div>
          ))}
          {visionLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm">V</div>
              <div className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={visionBottomRef} />
        </div>
        <div className="border-t border-gray-800 px-6 py-4">
          <div className="flex gap-3 items-end">
            <textarea value={visionInput} onChange={(e) => setVisionInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleVisionChat(); }}} placeholder="Ask about the image..." rows={1} className={`flex-1 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors ${isDark ? "bg-gray-900 border border-gray-800 placeholder-gray-600 text-white" : "bg-gray-100 border border-gray-300 placeholder-gray-400 text-gray-900"}`} />
            <button onClick={handleVisionChat} disabled={visionLoading || !visionInput.trim()} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 rounded-xl transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
            </button>
          </div>
        </div>
      </>
    )}
  </div>
        
       : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 mt-20">
                  <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center text-3xl">🧠</div>
                  <h2 className="text-xl font-semibold">VisionSync AI</h2>
                  <p className="text-gray-500 text-sm max-w-md">An on-device multimodal AI assistant. Ask me anything, upload images, or use voice commands.</p>
                  <div className="grid grid-cols-2 gap-3 mt-4 w-full max-w-md">
                    {["Explain quantum computing", "Write a Python script", "Translate to Hindi", "Summarize this text"].map((s) => (
                      <button key={s} onClick={() => setInput(s)} className="text-left px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-violet-500 text-sm text-gray-400 hover:text-white transition-all">{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm flex-shrink-0">V</div>}
                  <div className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-violet-600 text-white rounded-br-sm" : isDark ? "bg-gray-900 text-gray-200 rounded-bl-sm border border-gray-800" : "bg-white text-gray-800 rounded-bl-sm border border-gray-200 shadow-sm"}`}>
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm">V</div>
                  <div className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className={`border-t px-6 py-4 ${isDark ? "border-gray-800" : "border-gray-200 bg-white"}`}>
              <div className="flex gap-3 items-end">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Ask VisionSync AI anything..." rows={1} className={`flex-1 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors ${isDark ? "bg-gray-900 border border-gray-800 placeholder-gray-600 text-white" : "bg-gray-100 border border-gray-300 placeholder-gray-400 text-gray-900"}`} />
                <button onClick={startVoice} disabled={isListening} className={`px-4 py-3 rounded-xl transition-colors ${isListening ? "bg-red-500 animate-pulse cursor-not-allowed" : "bg-gray-800 hover:bg-gray-700"}`} title="Voice Input">🎤</button>
                <button onClick={sendMessage} disabled={loading || !input.trim()} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 rounded-xl transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;