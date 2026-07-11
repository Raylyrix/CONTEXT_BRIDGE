import { useState } from "react";
import { Message, ImportedChat } from "../types";
import { Search, Copy, Check, Info, Bot, User, ArrowUpRight, HelpCircle } from "lucide-react";

interface ChatViewerProps {
  chat: ImportedChat;
}

export default function ChatViewer({ chat }: ChatViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyTranscript = () => {
    const formatted = chat.messages
      .map((msg, index) => {
        const speaker = msg.role === "user" ? "### 👤 HUMAN / USER" : `### 🤖 AI ASSISTANT (${chat.source})`;
        return `${speaker}\n\n${msg.text}\n\n---\n`;
      })
      .join("\n");
    navigator.clipboard.writeText(formatted);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const filteredMessages = chat.messages.filter((msg) =>
    msg.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalWords = chat.messages.reduce((acc, msg) => acc + msg.text.split(/\s+/).length, 0);

  // Get custom theme variables based on platform source
  const getPlatformStyle = (source: string) => {
    const src = source.toLowerCase();
    if (src.includes("claude")) {
      return {
        bg: "bg-orange-500/10 border-orange-500/20 text-orange-400",
        badge: "Claude",
        dot: "bg-orange-500",
        bgLight: "bg-orange-500/5",
        textGlow: "shadow-orange-500/20"
      };
    }
    if (src.includes("chatgpt") || src.includes("openai")) {
      return {
        bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
        badge: "ChatGPT",
        dot: "bg-emerald-500",
        bgLight: "bg-emerald-500/5",
        textGlow: "shadow-emerald-500/20"
      };
    }
    if (src.includes("gemini") || src.includes("google")) {
      return {
        bg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
        badge: "Gemini",
        dot: "bg-blue-500",
        bgLight: "bg-blue-500/5",
        textGlow: "shadow-blue-500/20"
      };
    }
    if (src.includes("deepseek")) {
      return {
        bg: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
        badge: "DeepSeek",
        dot: "bg-cyan-500",
        bgLight: "bg-cyan-500/5",
        textGlow: "shadow-cyan-500/20"
      };
    }
    return {
      bg: "bg-stone-500/10 border-stone-500/20 text-stone-400",
      badge: "AI Source",
      dot: "bg-stone-500",
      bgLight: "bg-stone-850/20",
      textGlow: "shadow-stone-500/20"
    };
  };

  const style = getPlatformStyle(chat.source);

  return (
    <div className="flex flex-col h-full bg-stone-900/50 rounded-xl border border-stone-800 overflow-hidden shadow-lg">
      {/* Header Info */}
      <div className="p-4 md:p-5 border-b border-stone-800 bg-stone-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${style.bg}`}>
              {style.badge}
            </span>
            <h3 className="text-sm font-medium text-white max-w-xs truncate md:max-w-md">
              {chat.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {chat.url && (
              <a
                href={chat.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-stone-400 hover:text-white flex items-center gap-1.5 transition-colors font-medium bg-stone-900 px-2.5 py-1.5 rounded border border-stone-800"
              >
                Original Chat
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={handleCopyTranscript}
              className="text-xs text-stone-400 hover:text-white flex items-center gap-1.5 transition-colors font-medium bg-stone-900 px-2.5 py-1.5 rounded border border-stone-800"
              title="Copy the entire conversation pre-formatted as clean Markdown"
            >
              {copiedTranscript ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Transcript
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 bg-[#0a0a0a] p-2.5 rounded border border-stone-800/85 text-center text-[11px] md:text-xs">
          <div>
            <span className="text-stone-500 block mb-0.5 uppercase tracking-wider font-mono text-[9px]">Turns</span>
            <strong className="text-stone-200 font-medium">{chat.messages.length} exchanges</strong>
          </div>
          <div>
            <span className="text-stone-500 block mb-0.5 uppercase tracking-wider font-mono text-[9px]">Words</span>
            <strong className="text-stone-200 font-medium">{totalWords.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-stone-500 block mb-0.5 uppercase tracking-wider font-mono text-[9px]">Est. Tokens</span>
            <strong className="text-white font-bold">{Math.round(totalWords * 1.35).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-stone-800/60 bg-stone-900/40 flex items-center gap-2.5">
        <Search className="w-4 h-4 text-stone-500 flex-shrink-0 ml-1.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search conversation text..."
          className="w-full bg-transparent text-stone-200 placeholder-stone-600 text-xs focus:outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="text-[10px] text-stone-400 hover:text-stone-200 transition-colors bg-stone-800 px-1.5 py-0.5 rounded border border-stone-700"
          >
            Reset
          </button>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 max-h-[580px]">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-stone-500">
            <Info className="w-8 h-8 text-stone-600 mb-2" />
            <p className="text-sm">No messages match search filters.</p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={index}
                className={`group flex flex-col gap-2 p-4 rounded border transition-all duration-300 ${
                  isUser
                    ? "bg-stone-950/20 border-stone-800/60 hover:border-stone-700/80"
                    : `${style.bgLight} border-stone-800/85 hover:border-stone-700`
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-stone-800/45 pb-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {isUser ? (
                      <span className="flex items-center justify-center w-6 h-6 rounded bg-stone-800 text-stone-300">
                        <User className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className={`flex items-center justify-center w-6 h-6 rounded ${style.bg}`}>
                        <Bot className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span className={`text-xs font-bold tracking-wider uppercase ${isUser ? "text-stone-400" : style.bg.split(" ")[2]}`}>
                      {isUser ? "Human / User" : style.badge}
                    </span>
                    <span className="text-[10px] text-stone-600 font-mono">
                      #{index + 1}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleCopyMessage(msg.text, index)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-stone-500 hover:text-stone-300 transition-all p-1 rounded hover:bg-stone-850"
                    title="Copy full message markdown"
                  >
                    {copiedIndex === index ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="text-stone-200 text-xs leading-relaxed font-sans whitespace-pre-wrap select-text break-words overflow-x-auto">
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
