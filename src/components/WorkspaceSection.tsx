import { useState, useEffect, FormEvent } from "react";
import { Message, ImportedChat, OptimizationResult } from "../types";
import { Sparkles, Copy, Check, Terminal, FileText, Shrink, MessageSquare, AlertCircle, RefreshCw, Send, Loader2, Info, BookOpen, Layers } from "lucide-react";

interface WorkspaceSectionProps {
  chat: ImportedChat;
}

export default function WorkspaceSection({ chat }: WorkspaceSectionProps) {
  const [activeTab, setActiveTab] = useState<"prompt" | "summary" | "compact" | "ask">("prompt");
  const [targetAi, setTargetAi] = useState<string>("ChatGPT");
  const [goal, setGoal] = useState<string>("Opinion & Critique");
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prompt Copy state
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedCompact, setCopiedCompact] = useState(false);

  // Ask Gemini Assistant states
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string }>>([]);

  // Research Scratchpad states
  const [scratchpadText, setScratchpadText] = useState("");
  const [includeScratchpad, setIncludeScratchpad] = useState(true);

  // Load scratchpad from localStorage on chat changes
  useEffect(() => {
    const stored = localStorage.getItem(`context_scratchpad_${chat.id}`);
    setScratchpadText(stored || "");
  }, [chat.id]);

  const handleScratchpadChange = (val: string) => {
    setScratchpadText(val);
    localStorage.setItem(`context_scratchpad_${chat.id}`, val);
  };

  // Load results whenever chat changes or optimization params update
  const generateContextAndSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chat.messages,
          targetAi,
          goal,
          customInstructions,
          scratchpadNotes: includeScratchpad ? scratchpadText : "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to optimize context.");
      }

      const data = await response.json();
      if (data.success) {
        setResults({
          optimizedPrompt: data.optimizedPrompt,
          summary: data.summary,
          compactedContext: data.compactedContext,
        });
      } else {
        throw new Error("Optimizer endpoint returned error.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred optimizing this context.");
    } finally {
      setLoading(false);
    }
  };

  // Run automatically when the chat loads or targets change
  useEffect(() => {
    generateContextAndSummary();
    // Reset QA history when the chat changes
    setQaHistory([]);
    setQuestion("");
    setAskError(null);
  }, [chat.id, targetAi, goal]);

  const handleCopy = (text: string, type: "prompt" | "summary" | "compact") => {
    navigator.clipboard.writeText(text);
    if (type === "prompt") {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else if (type === "summary") {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } else if (type === "compact") {
      setCopiedCompact(true);
      setTimeout(() => setCopiedCompact(false), 2000);
    }
  };

  const handleAskQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim() || asking) return;

    setAsking(true);
    setAskError(null);
    const currentQuestion = question;
    setQuestion("");

    try {
      const response = await fetch("/api/ask-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chat.messages,
          question: currentQuestion,
          sourcePlatform: chat.source,
          title: chat.title,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to query context.");
      }

      const data = await response.json();
      if (data.success) {
        setQaHistory((prev) => [...prev, { q: currentQuestion, a: data.answer }]);
      } else {
        throw new Error("Assistant endpoint returned failure state.");
      }
    } catch (err: any) {
      console.error(err);
      setAskError(err.message || "Failed to query the assistant.");
      setQuestion(currentQuestion); // Restore
    } finally {
      setAsking(false);
    }
  };

  const goals = [
    "Opinion & Critique",
    "Continue Chat",
    "Summarize & Digest",
    "Debug & Solve",
    "Explain Like I'm 5",
    "Technical Co-Architect",
    "Bug Hunter & Test Writer",
    "UI/UX & Frontend Critique",
    "Technical Writer & Documenter"
  ];

  const targetAIs = [
    "ChatGPT",
    "Claude",
    "Gemini",
    "DeepSeek",
    "Universal / System Prompt"
  ];

  // Token budget calculations
  const charCount = chat.messages.reduce((sum, m) => sum + (m.text || "").length, 0);
  const estTokens = Math.ceil(charCount / 3.9);

  const modelLimits: Record<string, { limit: number; name: string; color: string }> = {
    "ChatGPT": { limit: 128000, name: "GPT-4o (128k limit)", color: "bg-emerald-500" },
    "Claude": { limit: 200000, name: "Claude 3.5 (200k limit)", color: "bg-amber-600" },
    "Gemini": { limit: 2000000, name: "Gemini 1.5 Pro (2M limit)", color: "bg-indigo-600" },
    "DeepSeek": { limit: 64000, name: "DeepSeek V3 (64k limit)", color: "bg-blue-600" },
    "Universal / System Prompt": { limit: 100000, name: "General Context (100k limit)", color: "bg-stone-600" }
  };

  const currentLimit = modelLimits[targetAi] || { limit: 100000, name: "General Context (100k limit)", color: "bg-stone-600" };
  const fillPercentage = parseFloat(Math.min((estTokens / currentLimit.limit) * 100, 100).toFixed(2));

  return (
    <div className="flex flex-col h-full bg-stone-900/50 rounded-xl border border-stone-800 overflow-hidden shadow-lg">
      {/* Workspace Menu Tabs */}
      <div className="flex bg-[#0d0d0d] border-b border-stone-800 px-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("prompt")}
          className={`flex items-center gap-2 px-4 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all leading-none ${
            activeTab === "prompt"
              ? "border-stone-100 text-stone-100"
              : "border-transparent text-stone-500 hover:text-stone-300"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Target Prompt
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex items-center gap-2 px-4 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all leading-none ${
            activeTab === "summary"
              ? "border-stone-100 text-stone-100"
              : "border-transparent text-stone-500 hover:text-stone-300"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Smart Digest
        </button>
        <button
          onClick={() => setActiveTab("compact")}
          className={`flex items-center gap-2 px-4 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all leading-none ${
            activeTab === "compact"
              ? "border-stone-100 text-stone-100"
              : "border-transparent text-stone-500 hover:text-stone-300"
          }`}
        >
          <Shrink className="w-3.5 h-3.5" />
          Compacted Context
        </button>
        <button
          onClick={() => setActiveTab("ask")}
          className={`flex items-center gap-2 px-4 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all leading-none ${
            activeTab === "ask"
              ? "border-stone-100 text-stone-100"
              : "border-transparent text-stone-500 hover:text-stone-300"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Ask Gemini Companion
        </button>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 p-5 overflow-y-auto max-h-[580px]">
        {error && (
          <div className="mb-4 p-4 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-start gap-2.5">
            <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Optimization Error:</span> {error}
              <button
                onClick={generateContextAndSummary}
                className="block text-stone-300 font-bold mt-1.5 hover:underline"
              >
                Retry generation
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: PROMPT BUILDER */}
        {activeTab === "prompt" && (
          <div className="space-y-5 animate-fade-in">
            {/* Visual Token Budget comparison bar */}
            <div className="bg-[#0e0e0e] border border-stone-850 rounded p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-stone-450" />
                  <span className="text-xs font-semibold text-stone-300">Context Weight Analysis</span>
                </div>
                <div className="text-[10px] text-stone-500 font-mono">
                  {estTokens.toLocaleString()} / {currentLimit.limit.toLocaleString()} tokens estimated
                </div>
              </div>
              <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-900">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${currentLimit.color}`}
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-stone-500">
                <span>Selected model target: <strong className="text-stone-350">{currentLimit.name}</strong></span>
                <span className="flex items-center gap-1">
                  <span>Usage:</span>
                  <strong className={fillPercentage > 80 ? "text-rose-400" : fillPercentage > 40 ? "text-amber-400" : "text-emerald-400"}>
                    {fillPercentage}%
                  </strong>
                  {fillPercentage > 70 && (
                    <span className="text-[9px] uppercase tracking-wide px-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                      Compaction advised
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 font-mono">
                  Destination AI Platform
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {targetAIs.map((ai) => (
                    <button
                      key={ai}
                      onClick={() => setTargetAi(ai)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold transition-all border ${
                        targetAi === ai
                          ? "bg-stone-800 border-stone-750 text-white"
                          : "bg-stone-950/40 border-stone-850 text-stone-500 hover:border-stone-700 hover:text-stone-350"
                      }`}
                    >
                      {ai}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 font-mono">
                  Bridge Goal / Mode
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {goals.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold transition-all border ${
                        goal === g
                          ? "bg-stone-800 border-stone-750 text-white"
                          : "bg-stone-950/40 border-stone-850 text-stone-500 hover:border-stone-700 hover:text-stone-350"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom inputs */}
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 font-mono">
                Custom Context Rules / Focus Area <span className="text-stone-600">(Optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Focus on the API database refactoring parts, ignore CSS questions"
                  className="w-full bg-[#0a0a0a] border border-stone-850 rounded px-4 py-2 text-xs text-white focus:outline-none focus:border-stone-600 transition-colors placeholder-stone-700"
                />
                <button
                  onClick={generateContextAndSummary}
                  disabled={loading}
                  className="bg-stone-800 hover:bg-stone-750 text-stone-200 px-3.5 py-2 rounded border border-stone-700 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  Rebuild
                </button>
              </div>
            </div>

            {/* Customizable Research Scratchpad accordion block */}
            <div className="bg-[#0d0d0d] border border-stone-850 rounded p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-850 pb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-stone-400 animate-pulse" />
                  <span className="text-xs font-semibold text-stone-200 font-serif italic">Research Scratchpad & Directives</span>
                </div>
                <label className="flex items-center gap-2 text-[10px] font-mono uppercase text-stone-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeScratchpad}
                    onChange={(e) => setIncludeScratchpad(e.target.checked)}
                    className="rounded border-stone-800 bg-[#060606] text-stone-300 focus:ring-0 w-3 h-3 cursor-pointer"
                  />
                  Bundle into Prompt
                </label>
              </div>
              <p className="text-[10px] text-stone-500 leading-relaxed font-sans">
                Capture design code snippets, special constraint directives, or architectural targets to package cleanly alongside the chat history context. Saved locally per workspace session.
              </p>
              <textarea
                value={scratchpadText}
                onChange={(e) => handleScratchpadChange(e.target.value)}
                placeholder="e.g. Database host is PostgreSQL. Express v5 routing. Keep code modular."
                className="w-full h-24 bg-[#070707] text-stone-200 placeholder-stone-800 text-xs p-3 rounded border border-stone-850 focus:border-stone-700 focus:outline-none transition-all resize-none font-mono leading-relaxed"
              />
            </div>

            {/* Generated Output */}
            <div className="relative">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 font-mono">
                Optimized Bridge Prompt ({targetAi})
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[#0a0a0a]/40 rounded border border-stone-800/80">
                  <Loader2 className="w-6 h-6 text-stone-400 animate-spin mb-3" />
                  <p className="text-xs text-stone-500 font-mono">Re-compiling prompt structure...</p>
                </div>
              ) : results ? (
                <div className="relative group/card bg-[#0a0a0a] rounded border border-stone-800 overflow-hidden">
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={() => handleCopy(results.optimizedPrompt, "prompt")}
                      className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-black rounded transition-all shadow-md"
                    >
                      {copiedPrompt ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Prompt
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="p-4 pt-12 text-stone-300 text-xs font-mono leading-relaxed select-text whitespace-pre-wrap max-h-80 overflow-y-auto">
                    {results.optimizedPrompt}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 bg-[#0a0a0a]/40 border border-stone-800 rounded text-xs text-stone-600">
                  No prompt generated yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: SMART DIGEST */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                Conversation Key takeaways
              </div>
              {results && (
                <button
                  onClick={() => handleCopy(results.summary, "summary")}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-200 rounded border border-stone-700 transition-all"
                >
                  {copiedSummary ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedSummary ? "Copied" : "Copy Summary"}
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-stone-500 animate-spin mb-3" />
                <p className="text-xs text-stone-600 font-mono">Extracting topics and actions...</p>
              </div>
            ) : results ? (
              <div className="bg-[#0a0a0a] p-5 rounded border border-stone-800 leading-relaxed text-xs text-stone-300 select-text whitespace-pre-wrap max-h-[420px] overflow-y-auto font-sans">
                {results.summary}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-stone-600">
                Awaiting context...
              </div>
            )}
          </div>
        )}

        {/* Tab 3: COMPACTED CONTEXT */}
        {activeTab === "compact" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                  Condensed Dialogue Representation
                </div>
                <span className="text-[10px] text-stone-550 block">Saves up to 70% token context overhead</span>
              </div>
              {results && (
                <button
                  onClick={() => handleCopy(results.compactedContext, "compact")}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-200 rounded border border-stone-700 transition-all"
                >
                  {copiedCompact ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedCompact ? "Copied" : "Copy Compact Context"}
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-stone-500 animate-spin mb-3" />
                <p className="text-xs text-stone-600 font-mono">Compacting conversational tokens...</p>
              </div>
            ) : results ? (
              <div className="bg-[#0a0a0a] p-5 rounded border border-stone-800 leading-relaxed text-xs text-stone-400 select-text whitespace-pre-wrap max-h-[420px] overflow-y-auto font-mono">
                {results.compactedContext}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-stone-600">
                Awaiting context...
              </div>
            )}
          </div>
        )}

        {/* Tab 4: INTERACTIVE GEMINI COMPANION */}
        {activeTab === "ask" && (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-[#0d0d0d] rounded border border-stone-850 text-[11px] text-stone-400 leading-relaxed">
              💡 <strong>Consultant mode:</strong> Directly prompt our server's high-speed Gemini assistant with this entire chat transcript pre-loaded into its active memory context. Ask it to write scripts, summarize decisions, or generate tests!
            </div>

            {/* QA Feed */}
            <div className="space-y-4 max-h-72 overflow-y-auto p-1">
              {qaHistory.length === 0 && (
                <div className="text-center py-10 text-xs text-stone-600">
                  Ask a question to start. e.g. "What was the final decision regarding database hosting?"
                </div>
              )}
              {qaHistory.map((qa, i) => (
                <div key={i} className="space-y-2 border-b border-stone-850 pb-3">
                  <div className="text-xs font-medium text-stone-200 flex items-start gap-1">
                    <span className="text-stone-550 font-mono font-bold">Q:</span> {qa.q}
                  </div>
                  <div className="text-xs text-stone-400 pl-4 border-l border-stone-800 select-text whitespace-pre-wrap">
                    {qa.a}
                  </div>
                </div>
              ))}
              {asking && (
                <div className="flex items-center gap-2 pl-4 py-2 text-xs text-stone-500">
                  <Loader2 className="w-3.5 h-3.5 text-stone-400 animate-spin" />
                  Gemini is thinking...
                </div>
              )}
              {askError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded border border-rose-500/10">
                  Error: {askError}
                </div>
              )}
            </div>

            {/* Prompt input Form */}
            <form onSubmit={handleAskQuestion} className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask Gemini anything about this conversation history..."
                disabled={asking}
                className="flex-1 bg-[#0a0a0a] border border-stone-800 rounded px-4 py-3 text-xs text-white placeholder-stone-700 focus:outline-none focus:border-stone-600 transition-colors"
              />
              <button
                type="submit"
                disabled={!question.trim() || asking}
                className="px-4 py-3 bg-stone-100 hover:bg-stone-200 disabled:bg-stone-900 disabled:text-stone-600 text-black rounded text-xs font-bold transition-all flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
