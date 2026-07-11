import { useState } from "react";
import { ImportedChat } from "../types";
import { Search, Plus, Trash2, Calendar, MessageSquare, Bot, ArrowRight, Layers } from "lucide-react";

interface SavedChatsSidebarProps {
  chats: ImportedChat[];
  selectedId: string | null;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onClearAll: () => void;
  onNewImport: () => void;
}

export default function SavedChatsSidebar({
  chats,
  selectedId,
  onSelectChat,
  onDeleteChat,
  onClearAll,
  onNewImport,
}: SavedChatsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSourceColor = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes("claude")) return "text-orange-400 border-orange-500/20 bg-orange-500/5";
    if (s.includes("chatgpt")) return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
    if (s.includes("gemini")) return "text-blue-400 border-blue-500/20 bg-blue-500/5";
    if (s.includes("deepseek")) return "text-cyan-400 border-cyan-500/20 bg-cyan-500/5";
    return "text-stone-400 border-stone-700 bg-stone-800/40";
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border-r border-stone-800/80 w-full md:w-80 flex-shrink-0 font-sans">
      {/* Workspace Header */}
      <div className="p-5 border-b border-stone-800 bg-[#0d0d0d]">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-stone-800 rounded border border-stone-700 text-stone-100">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-serif italic text-white tracking-tight leading-none">ContextBridge</h1>
            <span className="text-[10px] text-stone-500 font-medium font-mono">v1.1 • Live Porting</span>
          </div>
        </div>

        {/* New Import Trigger Button */}
        <button
          onClick={onNewImport}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 active:scale-[0.98] text-black rounded text-xs font-bold uppercase tracking-widest transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          New Extraction
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-stone-800/60 bg-[#0d0d0d]/40">
        <div className="relative flex items-center bg-stone-900/80 border border-stone-800 rounded px-3 py-2 text-xs">
          <Search className="w-3.5 h-3.5 text-stone-500 mr-2 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter saved transcripts..."
            className="bg-transparent text-stone-200 placeholder-stone-600 focus:outline-none w-full text-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-[10px] text-stone-500 hover:text-stone-300">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Saved Chats List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[480px]">
        <div className="text-[10px] font-bold text-stone-500 tracking-widest uppercase px-2 mb-2">
          Active Contexts ({filteredChats.length})
        </div>

        {filteredChats.length === 0 ? (
          <div className="text-center py-10 px-4 text-stone-600">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No transcripts stored yet.</p>
            <p className="text-[10px] text-stone-500 mt-1">Import one using the Bookmarks tool or paste window.</p>
          </div>
        ) : (
          filteredChats.map((c) => {
            const isSelected = c.id === selectedId;
            return (
              <div
                key={c.id}
                onClick={() => onSelectChat(c.id)}
                className={`group relative flex flex-col items-start gap-1 p-3.5 rounded border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-stone-900 border-stone-600 text-white shadow-md"
                    : "bg-stone-900/10 border-stone-900/60 text-stone-400 hover:bg-stone-900/50 hover:border-stone-800 hover:text-stone-200"
                }`}
              >
                {/* Delete button (only visible on hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete "${c.title}" from history?`)) {
                      onDeleteChat(c.id);
                    }
                  }}
                  className="absolute top-3 right-3 p-1 rounded hover:bg-stone-850 text-stone-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Remove from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getSourceColor(c.source)}`}>
                    {c.source}
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium flex items-center gap-0.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(c.importedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div className="text-xs font-medium line-clamp-1 pr-6 max-w-full tracking-tight">
                  {c.title}
                </div>

                <div className="text-[10px] text-stone-500 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {c.messages.length} exchanges • {c.messages.reduce((a, m) => a + m.text.split(/\s+/).length, 0).toLocaleString()} words
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clear Button */}
      {chats.length > 0 && (
        <div className="p-4 border-t border-stone-800 bg-[#0d0d0d]">
          <button
            onClick={() => {
              if (confirm("This will permanently clear all imported chat history from your browser storage. Proceed?")) {
                onClearAll();
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-stone-500 hover:text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/20 transition-all border border-transparent rounded text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Repository History
          </button>
        </div>
      )}
    </div>
  );
}
