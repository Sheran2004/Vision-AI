import { useState, useRef, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { QRCodeCanvas } from "qrcode.react";
import Papa from "papaparse";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

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
  const [activeTab, setActiveTab] = useState<"chat" | "ocr" | "summarizer" | "translator" | "detection" | "pdf" | "vision" | "search" | "qr" | "news" | "data" | "audio" | "meeting" | "medical" | "imagegen">("chat") ;
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState("");
  const [audioTranscript, setAudioTranscript] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [medicalImage, setMedicalImage] = useState<string | null>(null);
  const [medicalImageB64, setMedicalImageB64] = useState<string>("");
  const [medicalContentType, setMedicalContentType] = useState<string>("");
  const [medicalResult, setMedicalResult] = useState<string>("");
  const [medicalLoading, setMedicalLoading] = useState(false);
  const [medicalQuery, setMedicalQuery] = useState("Analyze this medical image and provide detailed observations.");
  const [summaryText, setSummaryText] = useState("");
  const [summaryResult, setSummaryResult] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryLength, setSummaryLength] = useState("medium");
  const [translateText, setTranslateText] = useState("");
  const [translateResult, setTranslateResult] = useState("");
  const [translateLoading, setTranslateLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageGenLoading, setImageGenLoading] = useState(false);
  const [meetingText, setMeetingText] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingAudioFile, setMeetingAudioFile] = useState<string | null>(null);
  const [meetingAudioLoading, setMeetingAudioLoading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("Hindi");
  const [detectResult, setDetectResult] = useState<{label: string; confidence: number}[]>([]);
  const [detectAnnotated, setDetectAnnotated] = useState<string | null>(null);
  const [detectLoading, setDetectLoading] = useState(false);
  const [visionImage, setVisionImage] = useState<string | null>(null);
  const [visionImageB64, setVisionImageB64] = useState<string>("");
  const [visionContentType, setVisionContentType] = useState<string>("");
  const [visionMessages, setVisionMessages] = useState<Message[]>([]);
  const [visionInput, setVisionInput] = useState("");
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsCategory, setNewsCategory] = useState("technology");
  const [newsQuery, setNewsQuery] = useState("");
  const [qrText, setQrText] = useState("");
  const [qrGenerated, setQrGenerated] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const visionBottomRef = useRef<HTMLDivElement>(null);
  const [pdfText, setPdfText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfPages, setPdfPages] = useState(0);
  const [pdfMessages, setPdfMessages] = useState<Message[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [dataAnalysis, setDataAnalysis] = useState("");
  const [dataLoading, setDataLoading] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const [pdfInput, setPdfInput] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pdfBottomRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
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

const handleMedicalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setMedicalImage(URL.createObjectURL(file));
  setMedicalContentType(file.type);
  setMedicalResult("");
  const reader = new FileReader();
  reader.onload = () => {
    const b64 = (reader.result as string).split(",")[1];
    setMedicalImageB64(b64);
  };
  reader.readAsDataURL(file);
};

const analyzeMedicalImage = async () => {
  if (!medicalImageB64) return;
  setMedicalResult("");
  setMedicalLoading(true);
  try {
    const res = await fetch("https://visionsync-backend.onrender.com/api/vision-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: medicalQuery,
        image_base64: medicalImageB64,
        content_type: medicalContentType,
        system_prompt: "You are a medical AI assistant. Analyze medical images carefully and provide detailed observations. Always remind users to consult a qualified healthcare professional for proper diagnosis."
      }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    setMedicalResult(" ");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
      setMedicalResult(text);
    }
  } catch {
    setMedicalResult("❌ Error: Analysis failed.");
  } finally {
    setMedicalLoading(false);
  }
};

const handleAudioTranscribe = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setAudioFileName(file.name);
  setAudioFile(URL.createObjectURL(file));
  setAudioTranscript("");
  setAudioLoading(true);
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch("https://visionsync-backend.onrender.com/api/transcribe", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setAudioTranscript(data.text);
  } catch {
    setAudioTranscript("❌ Error: Transcription failed.");
  } finally {
    setAudioLoading(false);
  }
};

const handleImageGeneration = async () => {
  if (!imagePrompt.trim()) return;
  setGeneratedImage(null);
  setImageGenLoading(true);
  try {
    const res = await fetch("https://visionsync-backend.onrender.com/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: imagePrompt }),
    });
    const data = await res.json();
    if (data.image) {
      setGeneratedImage(data.image);
    } else {
      alert("❌ Error: " + data.error);
    }
  } catch {
    alert("❌ Error: Image generation failed.");
  } finally {
    setImageGenLoading(false);
  }
};

const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setCsvFileName(file.name);
  Papa.parse(file, {
    header: true,
    complete: (results) => {
      setCsvData(results.data as any[]);
      setCsvHeaders(Object.keys(results.data[0] as object));
      setXAxis(Object.keys(results.data[0] as object)[0]);
      setYAxis(Object.keys(results.data[0] as object)[1]);
    }
  });
};

const handleMeetingAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setMeetingAudioFile(URL.createObjectURL(file));
  setMeetingAudioLoading(true);
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch("https://visionsync-backend.onrender.com/api/transcribe", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setMeetingText(data.text);
  } catch {
    setMeetingText("❌ Transcription failed.");
  } finally {
    setMeetingAudioLoading(false);
  }
};

const generateMeetingNotes = async () => {
  if (!meetingText.trim()) return;
  setMeetingNotes("");
  setMeetingLoading(true);
  try {
    const res = await fetch("https://visionsync-backend.onrender.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Generate professional meeting notes from this transcript:\n\n${meetingText}`,
        history: [],
        system_prompt: `You are a professional meeting notes generator. From the given transcript or text, create:
1. **Meeting Summary** - Brief overview
2. **Key Discussion Points** - Main topics discussed
3. **Action Items** - Tasks assigned with owners if mentioned
4. **Decisions Made** - Important decisions
5. **Next Steps** - Follow-up items

Format everything clearly with proper headings.`
      }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    setMeetingNotes(" ");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
      setMeetingNotes(text);
    }
  } catch {
    setMeetingNotes("❌ Error: Failed to generate notes.");
  } finally {
    setMeetingLoading(false);
  }
};

const analyzeData = async () => {
  if (!csvData.length) return;
  setDataAnalysis("");
  setDataLoading(true);
  const sample = csvData.slice(0, 20);
  try {
    const res = await fetch("https://visionsync-backend.onrender.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Analyze this CSV data and provide insights, trends, and recommendations:\n\nHeaders: ${csvHeaders.join(", ")}\n\nSample Data:\n${JSON.stringify(sample, null, 2)}`,
        history: [],
        system_prompt: "You are a data analyst. Analyze the provided data and give clear insights, trends, patterns, and actionable recommendations."
      }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    setDataAnalysis(" ");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
      setDataAnalysis(text);
    }
  } catch {
    setDataAnalysis("❌ Error: Analysis failed.");
  } finally {
    setDataLoading(false);
  }
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

  const handleSearch = async () => {
  if (!searchQuery.trim()) return;
  setSearchResult("");
  setSearchLoading(true);
  try {
    const res = await fetch("https://visionsync-backend.onrender.com/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchQuery }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    setSearchResult(" ");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
      setSearchResult(text);
    }
  } catch {
    setSearchResult("❌ Error: Search failed.");
  } finally {
    setSearchLoading(false);
  }
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


  const fetchNews = async (category = newsCategory, query = "") => {
  setNewsLoading(true);
  setNewsArticles([]);
  try {
    const url = query
      ? `https://visionsync-backend.onrender.com/api/news?query=${encodeURIComponent(query)}`
      : `https://visionsync-backend.onrender.com/api/news?category=${category}`;
    const res = await fetch(url);
    const data = await res.json();
    setNewsArticles(data.articles || []);
  } catch {
    setNewsArticles([]);
  } finally {
    setNewsLoading(false);
  }
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm font-bold">V</div>
            <span className="font-bold text-lg">VisionSync AI</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white text-xl">
            ✕
          </button>
        </div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => setActiveTab("chat")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${activeTab === "chat" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>💬 AI Chat</button>
          <button onClick={() => setActiveTab("pdf")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "pdf" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>📑 PDF Chat</button>
          <button onClick={() => setActiveTab("ocr")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "ocr" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>📷 OCR Scanner</button>
          <button onClick={() => setActiveTab("summarizer")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "summarizer" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>📄 Summarizer</button>
          <button onClick={() => setActiveTab("translator")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "translator" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>🌐 Translator</button>
          <button onClick={() => setActiveTab("detection")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "detection" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>🎯 Object Detection</button>
          <button onClick={() => setActiveTab("vision")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "vision" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>🖼️ Vision Chat</button>
          <button onClick={() => setActiveTab("search")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "search" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>🔍 Web Search</button>
          <button onClick={() => setActiveTab("qr")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "qr" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>📱 QR Generator</button>
          <button onClick={() => { setActiveTab("news"); fetchNews(); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "news" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>🌍 News</button>
          <button onClick={() => setActiveTab("data")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "data" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>📊 Data Analyzer</button>
          <button onClick={() => setActiveTab("audio")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "audio" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>🎵 Audio Transcribe</button>
          <button onClick={() => setActiveTab("meeting")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "meeting" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>📝 Meeting Notes</button>
          <button onClick={() => setActiveTab("medical")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "medical" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>💊 Medical Analysis</button>
          <button onClick={() => setActiveTab("imagegen")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "imagegen" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>🎨 Image Generation</button>
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
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-3 text-gray-400 hover:text-white text-2xl">
              ☰
            </button>
          </div>
          <div>
            <h1 className="font-semibold text-lg">
              {activeTab === "chat" ? "AI Chat" : activeTab === "pdf" ? "PDF Chat" : activeTab === "ocr" ? "OCR Scanner" : activeTab === "summarizer" ? "Text Summarizer" : activeTab === "translator" ? "Translator" : activeTab === "vision" ? "Vision Chat" : activeTab === "search" ? "Web Search" : activeTab === "qr" ? "QR Generator" : activeTab === "news" ? "Real-time News" : activeTab === "data" ? "Data Analyzer" : activeTab === "audio" ? "Audio Transcription" : activeTab === "meeting" ? "Meeting Notes" : activeTab === "medical" ? "Medical Analysis" : activeTab === "imagegen" ? "Image Generation" : "Object Detection"}
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

) : activeTab === "audio" ? (
  <div className="flex-1 flex flex-col items-center justify-start px-6 py-8 overflow-y-auto">
    <div className="w-full max-w-2xl">
      <h2 className="text-xl font-semibold mb-2">🎵 Audio Transcription</h2>
      <p className="text-gray-500 text-sm mb-6">Upload audio file and convert to text using Whisper AI</p>

      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:border-violet-500 transition-colors bg-gray-900">
        <div className="text-4xl mb-2">🎵</div>
        <p className="text-gray-400 text-sm">Click to upload audio file</p>
        <p className="text-gray-600 text-xs mt-1">MP3, WAV, M4A, OGG supported</p>
        <input type="file" accept="audio/*" className="hidden" onChange={handleAudioTranscribe} />
      </label>

      {audioFile && (
        <div className="mt-4">
          <audio controls src={audioFile} className="w-full rounded-xl" />
          <p className="text-xs text-gray-500 mt-1">📁 {audioFileName}</p>
        </div>
      )}

      {audioLoading && (
        <div className="mt-6 flex items-center gap-3 text-violet-400">
          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Transcribing with Whisper AI...</span>
        </div>
      )}

      {audioTranscript && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Transcript:</h3>
          <div className={`rounded-xl p-4 text-sm text-gray-200 leading-relaxed ${isDark ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200 text-gray-800"}`}>
            {audioTranscript}
          </div>
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => navigator.clipboard.writeText(audioTranscript)}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              📋 Copy
            </button>
            <button
              onClick={() => { setInput(audioTranscript); setActiveTab("chat"); }}
              className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              💬 Send to AI Chat
            </button>
          </div>
        </div>
      )}
    </div>
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

) : activeTab === "data" ? (
  <div className="flex-1 flex flex-col px-6 py-6 overflow-y-auto">
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">📊 Data Analyzer</h2>
      <p className="text-gray-500 text-sm mb-6">Upload CSV/Excel and get AI-powered analysis with charts</p>

      {!csvData.length ? (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:border-violet-500 transition-colors bg-gray-900">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-400 text-sm">Click to upload CSV file</p>
          <p className="text-gray-600 text-xs mt-1">CSV files supported</p>
          <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
        </label>
      ) : (
        <div>
          <div className={`flex items-center justify-between p-3 rounded-xl mb-4 ${isDark ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200"}`}>
            <span className="text-sm">📄 {csvFileName} — {csvData.length} rows, {csvHeaders.length} columns</span>
            <button onClick={() => { setCsvData([]); setCsvHeaders([]); setDataAnalysis(""); }} className="text-xs text-red-400 hover:text-red-300">✕ Remove</button>
          </div>

          <div className="flex gap-3 mb-4 flex-wrap">
            <select value={xAxis} onChange={(e) => setXAxis(e.target.value)} className={`px-3 py-2 rounded-lg text-sm ${isDark ? "bg-gray-900 border border-gray-800 text-white" : "bg-gray-100 border border-gray-300"}`}>
              {csvHeaders.map(h => <option key={h} value={h}>{h} (X)</option>)}
            </select>
            <select value={yAxis} onChange={(e) => setYAxis(e.target.value)} className={`px-3 py-2 rounded-lg text-sm ${isDark ? "bg-gray-900 border border-gray-800 text-white" : "bg-gray-100 border border-gray-300"}`}>
              {csvHeaders.map(h => <option key={h} value={h}>{h} (Y)</option>)}
            </select>
            <button onClick={() => setChartType("bar")} className={`px-3 py-2 rounded-lg text-xs ${chartType === "bar" ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400"}`}>Bar</button>
            <button onClick={() => setChartType("line")} className={`px-3 py-2 rounded-lg text-xs ${chartType === "line" ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400"}`}>Line</button>
          </div>

          <div className={`p-4 rounded-xl mb-4 ${isDark ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200"}`}>
            <ResponsiveContainer width="100%" height={250}>
              {chartType === "bar" ? (
                <BarChart data={csvData.slice(0, 20)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey={xAxis} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip />
                  <Bar dataKey={yAxis} fill="#7c3aed" />
                </BarChart>
              ) : (
                <LineChart data={csvData.slice(0, 20)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey={xAxis} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip />
                  <Line type="monotone" dataKey={yAxis} stroke="#7c3aed" strokeWidth={2} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          <button onClick={analyzeData} disabled={dataLoading} className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 py-3 rounded-xl text-sm font-medium transition-colors mb-4">
            {dataLoading ? "Analyzing..." : "🤖 Analyze with AI"}
          </button>

          {dataAnalysis && (
            <div className={`rounded-xl p-4 text-sm leading-relaxed ${isDark ? "bg-gray-900 border border-gray-800 text-gray-200" : "bg-white border border-gray-200 text-gray-800"}`}>
              <MessageContent content={dataAnalysis} />
            </div>
          )}
        </div>
      )}
    </div>
  </div>

) : activeTab === "imagegen" ? (
  <div className="flex-1 flex flex-col items-center justify-start px-6 py-8 overflow-y-auto">
    <div className="w-full max-w-2xl">
      <h2 className="text-xl font-semibold mb-2">🎨 AI Image Generation</h2>
      <p className="text-gray-500 text-sm mb-6">Generate images from text using Stable Diffusion XL</p>

      <textarea
        value={imagePrompt}
        onChange={(e) => setImagePrompt(e.target.value)}
        placeholder="Describe the image you want to generate..."
        rows={4}
        className={`w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors ${isDark ? "bg-gray-900 border border-gray-800 text-white placeholder-gray-600" : "bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400"}`}
      />

      <div className="flex flex-wrap gap-2 mt-3">
        {[
          "A futuristic city at night with neon lights",
          "A beautiful sunset over mountains",
          "A robot reading a book in a library",
          "Abstract digital art with purple colors"
        ].map((p) => (
          <button key={p} onClick={() => setImagePrompt(p)} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition-colors">
            {p}
          </button>
        ))}
      </div>

      <button
        onClick={handleImageGeneration}
        disabled={imageGenLoading || !imagePrompt.trim()}
        className="mt-4 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors"
      >
        {imageGenLoading ? "Generating... (may take 30-60 seconds)" : "🎨 Generate Image"}
      </button>

      {imageGenLoading && (
        <div className="mt-6 flex flex-col items-center gap-3 text-violet-400">
          <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">AI is creating your image...</span>
          <span className="text-xs text-gray-500">This may take 30-60 seconds</span>
        </div>
      )}

      {generatedImage && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Generated Image:</h3>
          <img src={generatedImage} alt="Generated" className="w-full rounded-xl border border-gray-800" />
          <div className="flex gap-3 mt-3">
            
            <button
              onClick={() => {
                const link = document.createElement("a");
                link.href = generatedImage!;
                link.download = "visionsync-generated.jpg";
                link.click();
              }}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              ⬇️ Download
            </button>
            <button
              onClick={() => { setVisionImage(generatedImage); setVisionImageB64(generatedImage.split(",")[1]); setVisionContentType("image/jpeg"); setActiveTab("vision"); }}
              className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              🖼️ Analyze with Vision
            </button>
          </div>
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

        ) : activeTab === "vision" ? (
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
        
    
        ) : activeTab === "medical" ? (
  <div className="flex-1 flex flex-col items-center justify-start px-6 py-8 overflow-y-auto">
    <div className="w-full max-w-2xl">
      <h2 className="text-xl font-semibold mb-2">💊 Medical Image Analysis</h2>
      <p className="text-gray-500 text-sm mb-2">Upload X-ray, MRI, skin conditions, or medical reports</p>
      <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-xl px-4 py-3 mb-6">
        <p className="text-xs text-yellow-400">⚠️ For educational purposes only. Always consult a qualified healthcare professional for medical advice.</p>
      </div>

      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:border-violet-500 transition-colors bg-gray-900">
        <div className="text-4xl mb-2">🩺</div>
        <p className="text-gray-400 text-sm">Click to upload medical image</p>
        <p className="text-gray-600 text-xs mt-1">X-ray, MRI, skin photos, reports</p>
        <input type="file" accept="image/*" className="hidden" onChange={handleMedicalUpload} />
      </label>

      {medicalImage && (
        <div className="mt-4">
          <img src={medicalImage} alt="Medical" className="w-full max-h-64 object-contain rounded-xl border border-gray-800" />
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs text-gray-400 mb-2">Analysis Type:</p>
        <div className="flex flex-wrap gap-2">
          {[
            "Analyze this medical image and provide detailed observations.",
            "Describe what you see in this X-ray.",
            "Analyze this skin condition and describe its characteristics.",
            "Extract and summarize the information from this medical report."
          ].map((q) => (
            <button key={q} onClick={() => setMedicalQuery(q)} className={`px-3 py-1 rounded-lg text-xs text-left ${medicalQuery === q ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {q.slice(0, 35)}...
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={analyzeMedicalImage}
        disabled={medicalLoading || !medicalImageB64}
        className="mt-4 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors"
      >
        {medicalLoading ? "Analyzing..." : "🩺 Analyze Medical Image"}
      </button>

      {medicalLoading && (
        <div className="mt-4 flex items-center gap-3 text-violet-400">
          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Analyzing medical image...</span>
        </div>
      )}

      {medicalResult && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Analysis Result:</h3>
          <div className={`rounded-xl p-4 text-sm leading-relaxed ${isDark ? "bg-gray-900 border border-gray-800 text-gray-200" : "bg-white border border-gray-200 text-gray-800"}`}>
            <MessageContent content={medicalResult} />
          </div>
          <button
            onClick={() => { setInput(medicalResult); setActiveTab("chat"); }}
            className="mt-3 bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            💬 Discuss with AI
          </button>
        </div>
      )}
    </div>
  </div>


    ) : activeTab === "meeting" ? (
  <div className="flex-1 flex flex-col items-center justify-start px-6 py-8 overflow-y-auto">
    <div className="w-full max-w-2xl">
      <h2 className="text-xl font-semibold mb-2">📝 Meeting Notes Generator</h2>
      <p className="text-gray-500 text-sm mb-6">Upload audio or paste transcript — get professional meeting notes</p>

      <div className="flex gap-3 mb-4">
        <label className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl py-3 cursor-pointer text-sm text-gray-400 transition-colors">
          🎵 Upload Audio
          <input type="file" accept="audio/*" className="hidden" onChange={handleMeetingAudio} />
        </label>
      </div>

      {meetingAudioLoading && (
        <div className="flex items-center gap-3 text-violet-400 mb-4">
          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Transcribing audio...</span>
        </div>
      )}

      <textarea
        value={meetingText}
        onChange={(e) => setMeetingText(e.target.value)}
        placeholder="Paste meeting transcript or notes here... (or upload audio above)"
        rows={8}
        className={`w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors ${isDark ? "bg-gray-900 border border-gray-800 text-white placeholder-gray-600" : "bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400"}`}
      />

      <button
        onClick={generateMeetingNotes}
        disabled={meetingLoading || !meetingText.trim()}
        className="mt-4 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors"
      >
        {meetingLoading ? "Generating..." : "📝 Generate Meeting Notes"}
      </button>

      {meetingNotes && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Meeting Notes:</h3>
          <div className={`rounded-xl p-4 text-sm leading-relaxed ${isDark ? "bg-gray-900 border border-gray-800 text-gray-200" : "bg-white border border-gray-200 text-gray-800"}`}>
            <MessageContent content={meetingNotes} />
          </div>
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => navigator.clipboard.writeText(meetingNotes)}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              📋 Copy Notes
            </button>
            <button
              onClick={() => { setInput(meetingNotes); setActiveTab("chat"); }}
              className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              💬 Send to AI Chat
            </button>
          </div>
        </div>
      )}
    </div>
  </div>

  ) : activeTab === "search" ? (
  <div className="flex-1 flex flex-col items-center justify-start px-6 py-8 overflow-y-auto">
    <div className="w-full max-w-2xl">
      <h2 className="text-xl font-semibold mb-2">🔍 Web Search</h2>
      <p className="text-gray-500 text-sm mb-6">Search the internet with AI-powered answers</p>
      
      <div className="flex gap-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          placeholder="Search anything..."
          className={`flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors ${isDark ? "bg-gray-900 border border-gray-800 text-white placeholder-gray-600" : "bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400"}`}
        />
        <button
          onClick={handleSearch}
          disabled={searchLoading || !searchQuery.trim()}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-6 py-3 rounded-xl text-sm font-medium transition-colors"
        >
          {searchLoading ? "..." : "🔍"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {["Latest AI news", "Python tutorials", "Weather today", "Stock market"].map((q) => (
          <button key={q} onClick={() => setSearchQuery(q)} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition-colors">
            {q}
          </button>
        ))}
      </div>

      {searchLoading && (
        <div className="mt-6 flex items-center gap-3 text-violet-400">
          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Searching the web...</span>
        </div>
      )}

      {searchResult && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Results:</h3>
          <div className={`rounded-xl p-4 text-sm leading-relaxed ${isDark ? "bg-gray-900 border border-gray-800 text-gray-200" : "bg-white border border-gray-200 text-gray-800"}`}>
            <MessageContent content={searchResult} />
          </div>
          <button
            onClick={() => { setInput(searchResult); setActiveTab("chat"); }}
            className="mt-3 bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            💬 Send to AI Chat
          </button>
        </div>
      )}
    </div>
  </div>
       ) : activeTab === "qr" ? (
  <div className="flex-1 flex flex-col items-center justify-start px-6 py-8 overflow-y-auto">
    <div className="w-full max-w-2xl">
      <h2 className="text-xl font-semibold mb-2">📱 QR Code Generator</h2>
      <p className="text-gray-500 text-sm mb-6">Generate QR codes for any text, URL, or data</p>

      <textarea
        value={qrText}
        onChange={(e) => { setQrText(e.target.value); setQrGenerated(false); }}
        placeholder="Enter text, URL, or any data..."
        rows={4}
        className={`w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors ${isDark ? "bg-gray-900 border border-gray-800 text-white placeholder-gray-600" : "bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400"}`}
      />

      <div className="flex flex-wrap gap-2 mt-4">
        {["https://visionsync-frontend-two.vercel.app", "Hello World", "Contact: +91 9999999999", "Instagram: @username"].map((q) => (
          <button key={q} onClick={() => { setQrText(q); setQrGenerated(false); }} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition-colors truncate max-w-xs">
            {q}
          </button>
        ))}
      </div>

      <button
        onClick={() => setQrGenerated(true)}
        disabled={!qrText.trim()}
        className="mt-4 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors"
      >
        📱 Generate QR Code
      </button>

      {qrGenerated && qrText && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="bg-white p-6 rounded-2xl">
            <QRCodeCanvas id="qrCanvas" value={qrText} size={200} level="H" />
          </div>
          <p className="text-xs text-gray-500 text-center max-w-xs break-all">{qrText}</p>
          <button
            onClick={() => {
              const canvas = document.getElementById("qrCanvas") as HTMLCanvasElement;
              if (canvas) {
                const link = document.createElement("a");
                link.download = "qrcode.png";
                link.href = canvas.toDataURL();
                link.click();
              }
            }}
            className="bg-gray-800 hover:bg-gray-700 px-6 py-2 rounded-lg text-sm transition-colors"
          >
            ⬇️ Download QR Code
          </button>
        </div>
      )}
    </div>
  </div>
     
      ) : activeTab === "news" ? (
  <div className="flex-1 flex flex-col px-6 py-6 overflow-y-auto">
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">🌍 Real-time News</h2>
      <p className="text-gray-500 text-sm mb-4">Latest news powered by NewsAPI</p>

      <div className="flex gap-3 mb-4">
        <input
          value={newsQuery}
          onChange={(e) => setNewsQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") fetchNews(newsCategory, newsQuery); }}
          placeholder="Search news..."
          className={`flex-1 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-violet-500 ${isDark ? "bg-gray-900 border border-gray-800 text-white placeholder-gray-600" : "bg-gray-100 border border-gray-300 text-gray-900"}`}
        />
        <button onClick={() => fetchNews(newsCategory, newsQuery)} className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm">🔍</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {["technology", "business", "health", "science", "sports", "entertainment"].map((cat) => (
          <button
            key={cat}
            onClick={() => { setNewsCategory(cat); fetchNews(cat, ""); }}
            className={`px-3 py-1 rounded-lg text-xs capitalize ${newsCategory === cat ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {newsLoading && (
        <div className="flex items-center gap-3 text-violet-400 mb-4">
          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Fetching latest news...</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {newsArticles.map((article, i) => (
          <div key={i} className={`rounded-xl p-4 border ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
            <div className="flex gap-4">
              {article.urlToImage && (
                <img src={article.urlToImage} alt="" className="w-24 h-20 object-cover rounded-lg flex-shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-violet-400 mb-1">{article.source} • {new Date(article.publishedAt).toLocaleDateString()}</p>
                <h3 className="text-sm font-medium leading-snug mb-1 line-clamp-2">{article.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{article.description}</p>
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:text-violet-300 mt-1 inline-block">Read more →</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
     ):(
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