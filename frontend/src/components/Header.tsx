import React from "react";
import { FolderGit2, Upload, AlertCircle, ShieldCheck } from "lucide-react";
import type { Investigation } from "../types";

interface HeaderProps {
  activeTab: string;
  selectedInvestigation: Investigation | null;
  investigations: Investigation[];
  onSelectInvestigation: (inv: Investigation) => void;
  onOpenUploadModal: () => void;
  backendOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  selectedInvestigation,
  investigations,
  onSelectInvestigation,
  onOpenUploadModal,
  backendOnline,
}) => {
  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: "Forensic Command Center", subtitle: "Real-time case intelligence and operational metrics" },
    cases: { title: "Investigation Case Files", subtitle: "Manage active and archived digital forensic cases" },
    vault: { title: "Evidence Locker & Storage", subtitle: "Inspect raw text, SHA-256 hashes, and extracted documents" },
    ai_chat: { title: "AI Forensic Investigator Agent", subtitle: "Multi-document RAG analysis with citations & reasoning" },
    timeline: { title: "Automated Chronological Timeline", subtitle: "Chronological event extraction across evidence files" },
  };

  const current = tabTitles[activeTab] || { title: "AI Digital Investigator", subtitle: "Cyber Forensic Platform" };

  return (
    <header className="h-16 border-b border-[#222636] bg-[#0a0b0e]/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          {current.title}
        </h2>
        <p className="text-xs text-[#cbd5e1] mt-0.5">{current.subtitle}</p>
      </div>

      {/* Case Selector & Actions */}
      <div className="flex items-center gap-3">
        {/* Active Case Selector */}
        <div className="relative flex items-center">
          <FolderGit2 className="w-4 h-4 text-[#86efac] absolute left-3 pointer-events-none" />
          <select
            value={selectedInvestigation?.id || ""}
            onChange={(e) => {
              const found = investigations.find((inv) => inv.id === Number(e.target.value));
              if (found) onSelectInvestigation(found);
            }}
            className="pl-9 pr-8 py-1.5 bg-[#11131a] border border-[#222636] rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-[#22c55e] transition-all cursor-pointer hover:border-[#22c55e]/50"
          >
            <option value="" disabled>Select Target Case...</option>
            {investigations.map((inv) => (
              <option key={inv.id} value={inv.id}>
                Case #{inv.id}: {inv.title}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Button Shortcut */}
        <button
          onClick={onOpenUploadModal}
          disabled={!selectedInvestigation}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-[#86efac] to-[#22c55e] hover:opacity-90 disabled:opacity-50 text-black font-extrabold rounded-lg text-xs transition-all shadow-md shadow-[#22c55e]/20"
        >
          <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Upload Evidence</span>
        </button>

        {/* API Health Pill */}
        <div className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono ${
          backendOnline ? "bg-[#10b981]/15 border-[#10b981]/30 text-[#34d399]" : "bg-[#ef4444]/15 border-[#ef4444]/30 text-[#f87171]"
        }`}>
          {backendOnline ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span>{backendOnline ? "API Online" : "Offline"}</span>
        </div>
      </div>
    </header>
  );
};
