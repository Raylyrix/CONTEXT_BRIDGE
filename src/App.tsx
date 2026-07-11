import { useState, useEffect } from "react";
import { ImportedChat, Message } from "./types";
import SavedChatsSidebar from "./components/SavedChatsSidebar";
import BookmarkletSection from "./components/BookmarkletSection";
import RawPasteSection from "./components/RawPasteSection";
import ChatViewer from "./components/ChatViewer";
import WorkspaceSection from "./components/WorkspaceSection";
import { Sparkles, Bot, Layers, Plus, Loader2, MessageSquare, ArrowRight, BookOpen, Share2 } from "lucide-react";

export default function App() {
  const [chats, setChats] = useState<ImportedChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"import" | "workspace">("import");
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [clipboardImportNotification, setClipboardImportNotification] = useState(false);

  // Initialize: Load transcripts from browser localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("context_bridge_transcripts");
      if (stored) {
        const parsed = JSON.parse(stored) as ImportedChat[];
        setChats(parsed);
        if (parsed.length > 0) {
          setSelectedChatId(parsed[0].id);
          setViewMode("workspace");
        }
      }
    } catch (e) {
      console.error("Failed to parse local storage transcripts:", e);
    }
  }, []);

  // Sync state changes back to local storage
  const syncChatsToLocalStorage = (updated: ImportedChat[]) => {
    try {
      localStorage.setItem("context_bridge_transcripts", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to write transcripts to local storage:", e);
    }
  };

  // Check query params for active Bookmarklet redirects and clipboard imports
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importId = params.get("importId");
    const importMode = params.get("import_mode");
    
    if (importId) {
      handleQueryImport(importId);
    }

    if (importMode === "clipboard") {
      setClipboardImportNotification(true);
      // Try to read clipboard automatically if allowed
      tryAutoClipboardImport();
      // Remove query param from browser address bar cleanly without page refresh
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Set up global paste handler for instant high-speed context imports
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept if they are actively typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.isContentEditable
      ) {
        return;
      }
      
      const pastedText = e.clipboardData?.getData("text");
      if (pastedText) {
        tryImportJSON(pastedText);
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => {
      window.removeEventListener("paste", handleGlobalPaste);
    };
  }, [chats]);

  const tryImportJSON = (text: string): boolean => {
    try {
      const parsed = JSON.parse(text.trim());
      if (parsed && parsed.messages && Array.isArray(parsed.messages)) {
        const newChat: ImportedChat = {
          id: "chat_" + Math.random().toString(36).substring(2, 11),
          title: parsed.title || "AI Conversation Import",
          source: parsed.source || "Unknown",
          url: parsed.url || undefined,
          importedAt: Date.now(),
          messages: parsed.messages
        };

        const updated = [newChat, ...chats];
        setChats(updated);
        syncChatsToLocalStorage(updated);
        setSelectedChatId(newChat.id);
        setViewMode("workspace");
        setClipboardImportNotification(false);
        return true;
      }
    } catch (e) {
      // Not a valid JSON payload, ignore
    }
    return false;
  };

  const tryAutoClipboardImport = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const success = tryImportJSON(text);
          if (success) {
            console.log("Auto-imported context from clipboard successfully.");
          }
        }
      }
    } catch (err) {
      console.log("Clipboard direct access require permissions or user interaction.");
    }
  };

  const handleQueryImport = async (id: string) => {
    setSessionLoading(true);
    setSessionError(null);
    try {
      const res = await fetch(`/api/get-import?id=${id}`);
      if (!res.ok) {
        throw new Error("Temporary import session expired or not found.");
      }
      
      const data = await res.json();
      if (data.success && data.session) {
        const newChat: ImportedChat = {
          id: "chat_" + Math.random().toString(36).substring(2, 11),
          title: data.session.title || "Imported Chat",
          source: data.session.source || "Unknown",
          url: data.session.url || undefined,
          importedAt: Date.now(),
          messages: data.session.messages
        };

        const updated = [newChat, ...chats];
        setChats(updated);
        syncChatsToLocalStorage(updated);
        setSelectedChatId(newChat.id);
        setViewMode("workspace");
        
        // Remove query param from browser address bar cleanly without page refresh
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      } else {
        throw new Error("Failed to read import payload.");
      }
    } catch (err: any) {
      console.error("Bookmarklet payload fetch error:", err);
      setSessionError(err.message || "Failed to finalize secure link transfer.");
      setViewMode("import");
    } finally {
      setSessionLoading(false);
    }
  };

  // Add parsed context to repository
  const handleImportComplete = (rawChat: Omit<ImportedChat, 'id' | 'importedAt'>) => {
    const newChat: ImportedChat = {
      ...rawChat,
      id: "chat_" + Math.random().toString(36).substring(2, 11),
      importedAt: Date.now()
    };

    const updated = [newChat, ...chats];
    setChats(updated);
    syncChatsToLocalStorage(updated);
    setSelectedChatId(newChat.id);
    setViewMode("workspace");
  };

  const handleSelectChat = (id: string) => {
    setSelectedChatId(id);
    setViewMode("workspace");
  };

  const handleDeleteChat = (id: string) => {
    const updated = chats.filter((c) => c.id !== id);
    setChats(updated);
    syncChatsToLocalStorage(updated);
    
    if (selectedChatId === id) {
      if (updated.length > 0) {
        setSelectedChatId(updated[0].id);
      } else {
        setSelectedChatId(null);
        setViewMode("import");
      }
    }
  };

  const handleClearAll = () => {
    setChats([]);
    syncChatsToLocalStorage([]);
    setSelectedChatId(null);
    setViewMode("import");
  };

  const activeChat = chats.find((c) => c.id === selectedChatId) || null;

  return (
    <div className="flex h-screen w-screen bg-[#090909] text-stone-100 overflow-hidden font-sans antialiased">
      {/* 1. Sidebar Repository Navigation */}
      <SavedChatsSidebar
        chats={chats}
        selectedId={selectedChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onClearAll={handleClearAll}
        onNewImport={() => setViewMode("import")}
      />

      {/* 2. Main Workspace Panel */}
      <main className="flex-1 flex flex-col h-full bg-[#090909] overflow-hidden relative">
        {/* Full screen Session Loader Overlay for Bookmarklet redirect ingestion */}
        {sessionLoading && (
          <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center z-50 text-center px-4 animate-fade-in">
            <div className="relative w-16 h-16 mb-8">
              <div className="absolute inset-0 rounded-full border border-stone-850"></div>
              <div className="absolute inset-0 rounded-full border border-t-stone-200 animate-spin"></div>
              <Bot className="w-6 h-6 text-stone-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <h2 className="text-lg font-normal text-white mb-2 tracking-tight font-serif italic">Securing Transfer Link Ingestion</h2>
            <p className="text-[10px] text-stone-500 font-mono tracking-widest uppercase animate-pulse">
              Transferring dynamic transcript frames...
            </p>
          </div>
        )}

        {/* Global Header */}
        <header className="h-16 border-b border-stone-900 bg-[#0d0d0d] px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {viewMode === "workspace" && activeChat ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold font-mono">Active Workspace</span>
                <span className="text-stone-700">/</span>
                <h2 className="text-xs font-semibold text-stone-300 max-w-xs truncate md:max-w-md">
                  {activeChat.title}
                </h2>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-stone-300 uppercase tracking-widest font-extrabold flex items-center gap-1 font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  Import Hub
                </span>
                <span className="text-stone-700">/</span>
                <span className="text-[11px] text-stone-500 font-medium">Capture transcripts cleanly</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {chats.length > 0 && viewMode === "import" && (
              <button
                onClick={() => {
                  if (selectedChatId) setViewMode("workspace");
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-850 border border-stone-800 px-3.5 py-1.5 rounded flex items-center gap-1.5 transition-all"
              >
                Back to Workspace
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="text-[10px] bg-stone-900 text-stone-400 border border-stone-850 font-mono px-2.5 py-1 rounded uppercase tracking-widest">
              Secure Local Sandbox
            </div>
          </div>
        </header>

        {/* Workspace Body Grid */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-h-[calc(100vh-4rem)]">
          {sessionError && (
            <div className="p-4 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-start gap-2.5">
              <Bot className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Handshake Failure:</span> {sessionError}
                <button
                  onClick={() => setSessionError(null)}
                  className="block text-stone-300 font-bold mt-1 hover:underline"
                >
                  Dismiss error
                </button>
              </div>
            </div>
          )}

          {viewMode === "import" || !activeChat ? (
            /* ================= IMPORT MODE ================= */
            <div className="max-w-5xl mx-auto space-y-8 pb-10">
              {clipboardImportNotification && (
                <div className="p-5 rounded border border-emerald-500/30 bg-emerald-500/5 text-stone-100 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in shadow-lg">
                  <div className="flex items-start md:items-center gap-3">
                    <span className="flex h-3 w-3 mt-1.5 md:mt-0 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-400">Ready to Load Extracted Transcript</h4>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Your browser clipboard contains an extracted chat. Press <kbd className="bg-stone-900 px-1 py-0.5 rounded text-[10px] text-stone-300 font-mono">Cmd + V</kbd> (or <kbd className="bg-stone-900 px-1 py-0.5 rounded text-[10px] text-stone-300 font-mono">Ctrl + V</kbd>) anywhere on this page, or click the button.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto self-stretch md:self-auto">
                    <button
                      onClick={tryAutoClipboardImport}
                      className="flex-1 md:flex-none text-center bg-stone-100 hover:bg-white text-black font-bold uppercase tracking-widest text-[10px] px-4 py-2.5 rounded transition-colors"
                    >
                      📋 Import From Clipboard
                    </button>
                    <button
                      onClick={() => setClipboardImportNotification(false)}
                      className="text-stone-400 hover:text-stone-200 text-xs px-2"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Marketing/Feature Intro Card */}
              <div className="relative overflow-hidden bg-[#0e0e0e] border border-stone-850 rounded p-6 md:p-10 shadow-lg">
                <div className="relative z-10 max-w-2xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-stone-900 text-stone-400 border border-stone-800 mb-4 uppercase tracking-widest text-[10px] font-mono leading-none">
                    <Layers className="w-3 h-3" />
                    AI Platform Context Porter
                  </span>
                  <h1 className="text-3xl md:text-4xl font-normal text-stone-100 tracking-tight leading-tight font-serif italic">
                    Never Lose Your Chat Context <br className="hidden sm:inline" />
                    When Switching Models.
                  </h1>
                  <p className="text-stone-400 text-xs md:text-sm mt-4 leading-relaxed font-sans max-w-xl">
                    Had a detailed coding session with Claude but want GPT-4o's critical assessment? Discussed copy with ChatGPT but need Gemini's layout generation? Just link or paste your history here, and generate optimized port prompts in seconds.
                  </p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 -right-12 w-64 h-64 bg-stone-800/10 rounded-full blur-3xl pointer-events-none"></div>
              </div>

              {/* Grid: Import Choices */}
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                {/* Method 1 */}
                <BookmarkletSection />

                {/* Method 2 */}
                <RawPasteSection onImportComplete={handleImportComplete} />
              </div>
            </div>
          ) : (
            /* ================= ACTIVE WORKSPACE MODE ================= */
            <div className="max-w-7xl mx-auto h-full pb-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
                {/* Timeline Panel (Left, 5 cols) */}
                <div className="lg:col-span-5 h-full">
                  <ChatViewer chat={activeChat} />
                </div>

                {/* Workspace Controls & Results Panel (Right, 7 cols) */}
                <div className="lg:col-span-7 h-full">
                  <WorkspaceSection chat={activeChat} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
