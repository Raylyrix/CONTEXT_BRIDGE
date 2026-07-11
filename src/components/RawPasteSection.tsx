import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Sparkles, Clipboard, Upload, FileText, Check, AlertCircle } from "lucide-react";
import { ImportedChat } from "../types";

interface RawPasteSectionProps {
  onImportComplete: (chat: Omit<ImportedChat, 'id' | 'importedAt'>) => void;
}

export default function RawPasteSection({ onImportComplete }: RawPasteSectionProps) {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status updates during server processing to keep user updated and entertained
  const [statusText, setStatusText] = useState("Awaiting text...");

  const parseContent = async (textToParse: string) => {
    if (!textToParse.trim()) {
      setError("Please paste some text or upload a file first.");
      return;
    }

    // 1. Check if this is a direct bookmarklet JSON export
    try {
      const parsed = JSON.parse(textToParse.trim());
      if (parsed && parsed.messages && Array.isArray(parsed.messages)) {
        onImportComplete({
          title: parsed.title || "AI Conversation Import",
          source: parsed.source || "Unknown",
          messages: parsed.messages,
          url: parsed.url || undefined
        });
        setRawText("");
        return;
      }
    } catch (e) {
      // Not valid JSON, continue with normal server-side messy text parser
    }

    setLoading(true);
    setError(null);
    setStatusText("Ingesting transcript document...");

    const statusIntervals = [
      { delay: 1500, text: "Identifying platform structures (Claude/ChatGPT/Gemini)..." },
      { delay: 3500, text: "Clearing DOM UI clutter, sidebar markers and share elements..." },
      { delay: 5500, text: "Gemini AI parsing speaker turns and dialogue sequences..." },
      { delay: 8000, text: "Reconstructing neat Markdown and formatting code blocks..." },
      { delay: 11000, text: "Structuring final conversation sequence..." }
    ];

    const timeouts = statusIntervals.map(item => 
      setTimeout(() => setStatusText(item.text), item.delay)
    );

    try {
      const response = await fetch("/api/parse-raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: textToParse }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to parse conversation.");
      }

      const data = await response.json();
      if (data.success) {
        onImportComplete({
          title: data.title || "AI Conversation Import",
          source: data.source || "Unknown",
          messages: data.messages
        });
        setRawText("");
      } else {
        throw new Error("Parser returned unsuccessful state.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during parsing. Please try again.");
    } finally {
      timeouts.forEach(clearTimeout);
      setLoading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setRawText(result);
        parseContent(result); // Auto parse on upload
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-stone-900/50 backdrop-blur-md rounded-xl border border-stone-800 p-6 md:p-8 shadow-xl">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-serif italic text-white flex items-center gap-2">
          <Sparkles className="w-5 md:w-6 h-5 md:h-6 text-stone-400" />
          AI-Powered Universal Paste
        </h2>
        <p className="text-sm text-stone-400 mt-1">
          Simply copy everything on the chat page (<kbd className="bg-stone-850 px-1 py-0.5 rounded text-[10px] text-stone-400 font-mono">Cmd/Ctrl + A</kbd> then <kbd className="bg-stone-850 px-1 py-0.5 rounded text-[10px] text-stone-400 font-mono">Cmd/Ctrl + C</kbd>) and paste it below, or drag in a saved HTML/text file. Our AI automatically extracts the perfect transcript.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Import Error:</span> {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-stone-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-white animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-white mb-2 font-serif italic">Analyzing Dialogue</h3>
          <p className="text-sm text-stone-400 font-mono animate-pulse">{statusText}</p>
          <p className="text-xs text-stone-600 mt-4 max-w-sm">
            This utilizes Gemini's high-intelligence parsing to separate speakers and clean up HTML tag pollution.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Text Area */}
          <div className="relative">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw conversation text or messy HTML from Claude, ChatGPT, Gemini, or other AI here..."
              className="w-full h-64 bg-stone-950/60 text-stone-100 placeholder-stone-700 text-sm p-4 rounded border border-stone-800 focus:border-stone-500 focus:outline-none transition-all resize-none font-mono leading-relaxed"
            />
            {rawText && (
              <button
                onClick={() => setRawText("")}
                className="absolute top-3 right-3 text-xs text-stone-500 hover:text-stone-300 transition-colors bg-stone-900/80 px-2 py-1 rounded border border-stone-800"
              >
                Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-4 rounded border border-dashed transition-all cursor-pointer text-center group ${
                isDragging
                  ? "border-stone-400 bg-stone-900/20 text-stone-200"
                  : "border-stone-800 bg-stone-950/20 hover:bg-[#0a0a0a]/40 text-stone-400 hover:text-stone-300"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".html,.htm,.txt,.json"
                className="hidden"
              />
              <Upload className={`w-6 h-6 mb-2 transition-transform group-hover:-translate-y-0.5 ${isDragging ? "text-stone-300" : "text-stone-600"}`} />
              <span className="text-xs font-semibold block mb-0.5">Upload saved HTML or export file</span>
              <span className="text-[10px] text-stone-500 block">Supports .html, .txt, .json</span>
            </div>

            {/* Submit Action */}
            <button
              onClick={() => parseContent(rawText)}
              disabled={!rawText.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded font-bold uppercase tracking-widest text-xs transition-all duration-300 bg-stone-100 hover:bg-stone-200 text-black disabled:bg-stone-900 disabled:text-stone-600 disabled:cursor-not-allowed shadow"
            >
              <Sparkles className="w-4 h-4" />
              Reconstruct with AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
