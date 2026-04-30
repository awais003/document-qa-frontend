"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Sparkles, Bot, User, Send, Loader2, FileText, Download, FilePlus, X, Upload, Plus, FolderOpen, Search, Mail, Globe, GitBranch } from "lucide-react";

interface Message {
  role: "user" | "ai";
  content: string;
  sources?: any[];
}

interface FileItem {
  filename: string;
  name: string;
  filepath: string;
}

export default function DocumentQA() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");

  // --- FILE LIBRARY STATES ---
  const [files, setFiles] = useState<FileItem[]>([]);
  const [fileLoading, setFileLoading] = useState(false);

  // --- UPLOAD STATES ---
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // --- ABOUT STATE ---
  const [showAbout, setShowAbout] = useState(false);

  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionId(uuidv4());
    fetchFiles(); // Initial load of files
  }, []);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // --- FETCH FILES LOGIC ---
  const fetchFiles = async () => {
    setFileLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/files`);
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setFileLoading(false);
    }
  };

  // --- UPLOAD LOGIC ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (selectedFiles.length + newFiles.length > 4) {
        alert("Maximum 4 files allowed.");
        return;
      }
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async () => {
    setUploading(true);
    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("files", file);
        return fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/upload`, {
          method: "POST",
          body: formData,
        });
      });

      await Promise.all(uploadPromises);
      alert("Files uploaded successfully!");
      setSelectedFiles([]);
      setIsUploadOpen(false);
      fetchFiles(); // REFRESH SIDE WINDOW
    } catch (error) {
      console.error("Upload Error:", error);
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${filePath}`);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error("Download Error:", error);
      alert("Could not download the file.");
    }
  };

  const handleSendMessage = async () => {
    if (!query.trim() || loading) return;

    const currentQuery = query;
    const userMsg: Message = { role: "user", content: currentQuery };

    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search?query=${encodeURIComponent(currentQuery)}&session_id=${sessionId}`
      );

      if (!response.ok) throw new Error("Connection failed");

      const data = await response.json();

      const aiMsg: Message = {
        role: "ai",
        content: data.result.answer,
        sources: data.result.sources?.filter((s: any) => s.status === "relevant") || [],
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "I'm having trouble reaching the server. Please check if the backend is running." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">

      {/* --- SIDE WINDOW (FILE LIBRARY) --- */}
      <aside className="w-72 border-r border-slate-200 bg-white flex flex-col hidden lg:flex">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <FolderOpen size={18} className="text-blue-600" />
            <span>Library</span>
          </div>
          <button onClick={fetchFiles} className="text-slate-400 hover:text-blue-600 transition-colors">
            <Loader2 size={14} className={fileLoading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {files.length === 0 && !fileLoading ? (
            <div className="text-center py-10 px-4">
              <FileText size={24} className="mx-auto text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">No documents found in storage.</p>
            </div>
          ) : (
            files.map((file, idx) => (
              <button
                key={idx}
                onClick={() => handleDownload(file.filepath, file.filename)}
                className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 group flex items-center gap-3 transition-all border border-transparent hover:border-slate-100"
              >
                <div className="bg-blue-50 p-2 rounded-md group-hover:bg-blue-100">
                  <FileText size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{file.name || file.filename}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Download</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* --- SIDEBAR BOTTOM: ABOUT TRIGGER --- */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setShowAbout(true)}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all group border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <User size={16} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-semibold text-slate-700">About Developer</p>
              <p className="text-[10px] text-slate-400 italic">View Portfolio</p>
            </div>
          </button>
        </div>
      </aside>

      {/* --- MAIN CHAT AREA --- */}
      <div className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 flex items-center px-6 justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Sparkles size={18} className="text-white" />
            </div>
            <h1 className="font-semibold text-slate-800 tracking-tight">
              Document <span className="text-blue-600">Q</span><span className="text-blue-600">A</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-slate-400 hidden sm:block">ID: {sessionId.slice(0, 8)}</span>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors border border-slate-200"
              title="Upload Documents"
            >
              <FilePlus size={20} />
            </button>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">v1.0 Ready</span>
          </div>
        </header>

        {/* --- UPLOAD OVERLAY --- */}
        {isUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setIsUploadOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>

              <h2 className="text-lg font-bold text-slate-800 mb-4">Upload Documents</h2>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center mb-4 hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={selectedFiles.length >= 4}
                />
                <label htmlFor="file-upload" className="cursor-pointer group">
                  <Upload className="mx-auto mb-2 text-slate-400 group-hover:text-blue-500 transition-colors" size={32} />
                  <p className="text-sm font-medium text-slate-600">Click to select files</p>
                  <p className="text-[10px] text-slate-400 mt-1">Maximum 4 files (PDF, TXT)</p>
                </label>
              </div>

              <div className="space-y-2 mb-6 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText size={14} className="text-blue-500" />
                      <span className="text-xs truncate text-slate-600">{file.name}</span>
                    </div>
                    <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsUploadOpen(false)}
                  className="flex-1 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadSubmit}
                  disabled={selectedFiles.length === 0 || uploading}
                  className="flex-1 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-md shadow-blue-200"
                >
                  {uploading ? "Uploading..." : `Upload ${selectedFiles.length} Files`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- ABOUT OVERLAY --- */}
        {showAbout && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowAbout(false)}
                className="absolute top-5 right-5 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-28 w-full"></div>

              <div className="px-8 pb-10">
                <div className="relative -mt-14 mb-4">
                  <div className="w-28 h-28 rounded-3xl bg-white p-1.5 shadow-2xl shadow-blue-200/50">
                    <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center text-blue-600 font-bold text-3xl">
                      {/* Your Initials */}
                      AJ
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Awais Jamil</h2>
                <p className="text-blue-600 font-semibold text-sm mb-6 flex items-center gap-2">
                  <Sparkles size={14} /> Full-Stack AI Engineer
                </p>

                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                  <p>
                    I specialize in building intelligent <strong>AI Automation</strong>, <strong>RAG systems</strong>, and <strong>AI agents</strong> including WhatsApp-based solutions.
                    My stack includes <strong>Django</strong>, <strong>React.js</strong>, and <strong>n8n</strong> for scalable, production-ready applications.
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Location</p>
                      <p className="text-slate-800 font-medium">Bahawalnagar, PK</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Core Tech</p>
                      <p className="text-slate-800 font-medium">Django / Gemini / React</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  {/* GitHub Link - Opens your repo */}
                  <a
                    href="https://github.com/awais003"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
                  >
                    <GitBranch size={16} /> GitHub
                  </a>


                </div>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pt-8 pb-32">
          <div className="max-w-3xl mx-auto px-4 space-y-8">
            {messages.length === 0 && (
              <div className="text-center py-20 space-y-4">
                <div className="bg-white border border-slate-200 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Bot size={32} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-medium text-slate-800">How can I help you today?</h2>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                  Ask about inventory velocity, supplier details, or store documents.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start animate-in fade-in slide-in-from-bottom-2 duration-300"}`}
              >
                <div className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${msg.role === "user" ? "bg-slate-800" : "bg-white border border-slate-200"}`}
                  >
                    {msg.role === "user" ? <User size={16} className="text-white" /> : <Bot size={16} className="text-blue-600" />}
                  </div>

                  <div className="space-y-2">
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`}
                    >
                      {msg.content}
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-1">
                        {msg.sources.map((src: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => handleDownload(src.file_path, src.file_name)}
                            className="flex items-center gap-1.5 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer border border-slate-200 hover:border-blue-200 group"
                            title={`Click to download: ${src.file_name}`}
                          >
                            <FileText size={12} className="text-slate-400 group-hover:text-blue-500" />
                            {src.file_name}
                            <Download size={10} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3 text-slate-400 text-sm pl-2">
                <Loader2 className="animate-spin" size={16} />
                <span className="animate-pulse">Thinking...</span>
              </div>
            )}
            <div ref={scrollEndRef} />
          </div>
        </main>

        <footer className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="relative group shadow-xl rounded-2xl">
              <input
                type="text"
                className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-5 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                placeholder="Message ApexStore AI..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${query.trim() && !loading ? "bg-blue-600 text-white shadow-md hover:bg-blue-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                disabled={!query.trim() || loading}
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-3">
              Document QA can make mistakes. Verify important information.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}