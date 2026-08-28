import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import type { ChatMessage, Investigation, Evidence } from "../types";

interface AIChatViewProps {
  messages: ChatMessage[];
  selectedInvestigation: Investigation | null;
  evidence: Evidence[];
  onSendMessage: (question: string) => Promise<void>;
  loading: boolean;
}

export const AIChatView: React.FC<AIChatViewProps> = ({
  messages,
  selectedInvestigation,
  evidence,
  onSendMessage,
  loading,
}) => {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const suggestedPrompts = [
    "Analyze cross-references and build event timeline",
    "Find key entities, locations, and timestamps",
    "Find potential contradictions or suspicious patterns",
    "Summarize all findings in this investigation case",
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !selectedInvestigation) return;
    const text = input;
    setInput("");
    onSendMessage(text);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#050b07]">
      {/* Target Case Info Bar */}
      <div className="p-3 bg-[#0b1710] border-b border-[#183324] flex items-center justify-between text-xs text-[#a7f3d0]">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#00ff87]" />
          <span className="font-semibold text-white">AI Forensic Assistant</span>
          {selectedInvestigation && (
            <span className="text-[11px] font-mono text-[#00ff87]">
              [Case #{selectedInvestigation.id}: {selectedInvestigation.title}]
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#4ed19c] font-mono">
          <span>{evidence.length} Evidence Documents Loaded</span>
        </div>
      </div>

      {/* Main Chat Stream */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#059669] via-[#10b981] to-[#00ff87] flex items-center justify-center shadow-2xl shadow-[#00ff87]/30">
              <Bot className="w-8 h-8 text-black stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">AI Digital Investigator</h3>
              <p className="text-xs text-[#a7f3d0] mt-2 leading-relaxed">
                Ask questions about your case evidence. The assistant performs semantic vector search over uploaded documents and synthesizes cited forensic answers.
              </p>
            </div>

            {/* Prompt Chips */}
            <div className="w-full pt-4 space-y-2">
              <p className="text-[10px] uppercase font-mono tracking-wider text-[#4ed19c]">Suggested Forensic Queries</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!selectedInvestigation) return;
                      onSendMessage(prompt);
                    }}
                    disabled={!selectedInvestigation}
                    className="p-3 rounded-xl bg-[#0b1710] border border-[#183324] hover:border-[#00ff87]/50 text-left text-xs text-[#a7f3d0] hover:text-white transition-all flex items-center justify-between group disabled:opacity-50"
                  >
                    <span>{prompt}</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#00ff87] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#059669] to-[#00ff87] flex items-center justify-center text-black font-bold shrink-0 mt-1 shadow-md shadow-[#00ff87]/20">
                  <Bot className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}

              <div
                className={`max-w-3xl rounded-2xl p-5 border text-xs leading-relaxed space-y-3 relative group ${
                  msg.role === "user"
                    ? "bg-[#12241a] border-[#00ff87]/40 text-white rounded-tr-none"
                    : "glass-panel border-[#183324] text-[#e2e8f0] rounded-tl-none"
                }`}
              >
                {/* Content */}
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {/* Evidence Citation Cards */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <div className="pt-3 border-t border-[#183324] space-y-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#00ff87] flex items-center gap-1 font-bold">
                      <FileText className="w-3 h-3" /> Cited Evidence Sources ({msg.evidence.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.evidence.slice(0, 4).map((cit, cIdx) => (
                        <div key={cIdx} className="p-2 rounded-lg bg-[#050b07] border border-[#183324] text-[11px]">
                          <p className="font-semibold text-white truncate">{cit.filename || cit.metadata?.filename || "Evidence Document"}</p>
                          <p className="text-[10px] text-[#4ed19c] font-mono mt-0.5">Relevance Score: {cit.distance ? (1 - Number(cit.distance)).toFixed(2) : "High"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Metadata & Actions */}
                <div className="flex items-center justify-between pt-2 text-[10px] text-[#4ed19c] font-mono">
                  <span>{new Date(msg.timestamp).toLocaleTimeString()} {msg.model ? `• ${msg.model}` : ""}</span>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white flex items-center gap-1"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-[#00ff87]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                    </button>
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-[#183324] flex items-center justify-center text-white shrink-0 mt-1 font-semibold text-xs border border-[#00ff87]/30">
                  YOU
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-4 items-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#059669] to-[#00ff87] flex items-center justify-center text-black shrink-0 animate-pulse">
              <Bot className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="p-4 rounded-2xl glass-panel border border-[#00ff87]/40 text-xs text-[#00ff87] flex items-center gap-3">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing evidence chunks & synthesizing forensic answer...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Controls */}
      <div className="p-4 bg-[#050b07] border-t border-[#183324]">
        {!selectedInvestigation && (
          <div className="mb-2 p-2 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg text-xs text-[#f87171] text-center font-medium">
            Please select a target case file to begin asking questions.
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            placeholder={selectedInvestigation ? "Ask questions or request analysis over case evidence..." : "Select a case file first..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!selectedInvestigation || loading}
            className="flex-1 px-4 py-3 bg-[#0b1710] border border-[#183324] focus:border-[#00ff87] rounded-xl text-xs text-white placeholder-[#4ed19c] focus:outline-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!selectedInvestigation || !input.trim() || loading}
            className="px-5 py-3 bg-gradient-to-r from-[#00ff87] to-[#10b981] text-black font-extrabold rounded-xl text-xs flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-md shadow-[#00ff87]/20"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
};
