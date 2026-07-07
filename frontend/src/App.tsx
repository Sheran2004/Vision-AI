import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function renderMarkdown(text: string) {
  let html = text;
  html = html.replace(/\*\*(.+?)\*\*/gs, '<strong style="font-weight:700;color:white">$1</strong>');
  html = html.replace(/\*(.+?)\*/gs, '<em>$1</em>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:1rem;font-weight:700;margin:12px 0 4px">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:1.1rem;font-weight:700;margin:12px 0 4px">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:1.2rem;font-weight:700;margin:12px 0 4px">$1</h1>');
  html = html.replace(/^[-=]{3,}$/gm, '<hr style="border-color:#4b5563;margin:8px 0"/>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

const LANGUAGES = [
  "Hindi", "Spanish", "French", "German", "Arabic",
  "Chinese", "Japanese", "Korean", "Portuguese", "Russian",
  "Italian", "Bengali", "Urdu", "Tamil", "Telugu"
];

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "ocr" | "summarizer" | "translator" | "detection">("chat");
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
  const [detectImage, setDetectImage] = useState<string | null>(null);
  const [detectResult, setDetectResult] = useState<{label: string; confidence: number}[]>([]);
  const [detectAnnotated, setDetectAnnotated] = useState<string | null>(null);
  const [detectLoading, setDetectLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice Input. Please use Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "no-speech") return;
      alert("Error: " + event.error);
    };
    recognition.start();
  };

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrImage(URL.createObjectURL(file));
    setOcrResult("");
    setOcrLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/api/ocr", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setOcrResult(data.text);
    } catch {
      setOcrResult("❌ Error: OCR failed.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!summaryText.trim()) return;
    setSummaryResult("");
    setSummaryLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summaryText, length: summaryLength }),
      });
      const data = await res.json();
      setSummaryResult(data.summary);
    } catch {
      setSummaryResult("❌ Error: Summarizer failed.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!translateText.trim()) return;
    setTranslateResult("");
    setTranslateLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: translateText, target_language: targetLanguage }),
      });
      const data = await res.json();
      setTranslateResult(data.translated);
    } catch {
      setTranslateResult("❌ Error: Translation failed.");
    } finally {
      setTranslateLoading(false);
    }
  };

  const handleDetection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDetectImage(URL.createObjectURL(file));
    setDetectResult([]);
    setDetectAnnotated(null);
    setDetectLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/api/detect", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setDetectResult(data.detections);
      setDetectAnnotated(data.annotated_image);
    } catch {
      alert("❌ Error: Object Detection failed.");
    } finally {
      setDetectLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      const aiMsg: Message = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Error: Backend se connect nahi ho paya." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm font-bold">V</div>
          <span className="font-bold text-lg">VisionSync AI</span>
        </div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => setActiveTab("chat")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${activeTab === "chat" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>
            💬 AI Chat
          </button>
          <button onClick={() => setActiveTab("ocr")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "ocr" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>
            📷 OCR Scanner
          </button>
          <button onClick={() => setActiveTab("summarizer")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "summarizer" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>
            📄 Summarizer
          </button>
          <button onClick={() => setActiveTab("translator")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "translator" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>
            🌐 Translator
          </button>
          <button onClick={() => setActiveTab("detection")} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === "detection" ? "bg-violet-600/20 text-violet-400" : "hover:bg-gray-800 text-gray-400"}`}>
            🎯 Object Detection
          </button>
        </nav>
        <div className="mt-auto text-xs text-gray-600 text-center">Powered by Snapdragon AI</div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">
              {activeTab === "chat" ? "AI Chat" : activeTab === "ocr" ? "OCR Scanner" : activeTab === "summarizer" ? "Text Summarizer" : activeTab === "translator" ? "Translator" : "Object Detection"}
            </h1>
            <p className="text-xs text-gray-500">
              {activeTab === "detection" ? "Powered by YOLOv8" : "Powered by Llama via Groq"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">Online</span>
          </div>
        </div>

        {/* OCR Tab */}
        {activeTab === "ocr" ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6 overflow-y-auto">
            <div className="w-full max-w-2xl">
              <h2 className="text-xl font-semibold mb-2">📷 OCR Scanner</h2>
              <p className="text-gray-500 text-sm mb-6">Upload an image to extract text using AI Vision</p>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:border-violet-500 transition-colors bg-gray-900">
                <div className="text-4xl mb-2">📁</div>
                <p className="text-gray-400 text-sm">Click to upload image</p>
                <p className="text-gray-600 text-xs mt-1">PNG, JPG, JPEG supported</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleOCR} />
              </label>
              {ocrImage && <div className="mt-6"><img src={ocrImage} alt="Uploaded" className="w-full max-h-64 object-contain rounded-xl border border-gray-800" /></div>}
              {ocrLoading && (
                <div className="mt-6 flex items-center gap-3 text-violet-400">
                  <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Extracting text with AI Vision...</span>
                </div>
              )}
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
              <button onClick={handleSummarize} disabled={summaryLoading || !summaryText.trim()} className="mt-4 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors">
                {summaryLoading ? "Summarizing..." : "✨ Summarize"}
              </button>
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
              <button onClick={handleTranslate} disabled={translateLoading || !translateText.trim()} className="mt-4 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors">
                {translateLoading ? "Translating..." : "🌐 Translate"}
              </button>
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

              {detectLoading && (
                <div className="mt-6 flex items-center gap-3 text-violet-400">
                  <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Detecting objects with YOLOv8...</span>
                </div>
              )}

              {detectAnnotated && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Detected Objects:</h3>
                  <img src={detectAnnotated} alt="Annotated" className="w-full rounded-xl border border-gray-800" />
                </div>
              )}

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

        ) : (
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
                  <div className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-violet-600 text-white rounded-br-sm" : "bg-gray-900 text-gray-200 rounded-bl-sm border border-gray-800"}`}>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
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
            <div className="border-t border-gray-800 px-6 py-4">
              <div className="flex gap-3 items-end">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Ask VisionSync AI anything..." rows={1} className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600" />
                <button onClick={startVoice} disabled={isListening} className={`px-4 py-3 rounded-xl transition-colors ${isListening ? "bg-red-500 animate-pulse cursor-not-allowed" : "bg-gray-800 hover:bg-gray-700"}`} title="Voice Input">🎤</button>
                <button onClick={sendMessage} disabled={loading || !input.trim()} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 rounded-xl transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">Press Enter to send • Shift+Enter for new line</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;