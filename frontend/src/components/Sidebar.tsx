import React from "react";
import {
  LayoutDashboard,
  FolderGit2,
  FileText,
  Bot,
  Clock,
  Shield,
  Radio,
  Plus,
  ChevronRight,
  Database,
  User,
} from "lucide-react";
import type { Investigation } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedInvestigation: Investigation | null;
  onOpenCreateModal: () => void;
  backendOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedInvestigation,
  onOpenCreateModal,
  backendOnline,
}) => {
  const navItems = [
    { id: "dashboard", label: "Overview Dashboard", icon: LayoutDashboard },
    { id: "cases", label: "Case File Index", icon: FolderGit2 },
    { id: "vault", label: "Evidence Vault", icon: FileText },
    { id: "ai_chat", label: "AI Forensic Agent", icon: Bot },
    { id: "timeline", label: "Event Timeline", icon: Clock },
  ];

  return (
    <aside className="w-72 bg-[#0a0b0e] border-r border-[#222636] flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#222636] flex items-center justify-between bg-[#0e1017]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#15803d] via-[#22c55e] to-[#86efac] flex items-center justify-center shadow-lg shadow-[#22c55e]/20">
            <Shield className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-xs tracking-wider flex items-center gap-1.5 font-mono">
              AI DIGITAL INVESTIGATOR
            </h1>
            <p className="text-[11px] text-[#86efac] font-medium mt-0.5">Cyber Forensic Platform</p>
          </div>
        </div>
      </div>

      {/* Active Case Banner */}
      <div className="p-4 bg-[#11131a]/80 border-b border-[#222636]">
        <div className="flex items-center justify-between text-xs text-[#cbd5e1] mb-1.5">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-[#94a3b8]">Target Case</span>
          <button
            onClick={onOpenCreateModal}
            className="text-[#86efac] hover:underline flex items-center gap-1 text-[11px] font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> New Case
          </button>
        </div>

        {selectedInvestigation ? (
          <div className="p-2.5 rounded-lg bg-[#181b26] border border-[#22c55e]/40 flex items-center justify-between group cursor-pointer hover:border-[#22c55e] transition-all shadow-md shadow-[#22c55e]/10">
            <div className="truncate pr-2">
              <p className="text-xs font-bold text-white truncate">{selectedInvestigation.title}</p>
              <p className="text-[10px] text-[#86efac] font-mono">CASE-#{selectedInvestigation.id}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          </div>
        ) : (
          <button
            onClick={() => setActiveTab("cases")}
            className="w-full p-2.5 rounded-lg bg-[#181b26]/50 border border-dashed border-[#222636] text-left text-xs text-[#94a3b8] hover:border-[#22c55e] transition-all"
          >
            Select an active case...
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-[#94a3b8]">Main Modules</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-[#22c55e]/20 to-[#86efac]/10 text-[#86efac] border border-[#22c55e]/40 shadow-sm shadow-[#22c55e]/10"
                  : "text-[#cbd5e1] hover:bg-[#11131a] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-[#86efac]" : "text-[#94a3b8]"}`} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#86efac]" />}
            </button>
          );
        })}
      </nav>

      {/* Author & Creation Info Footer */}
      <div className="p-4 border-t border-[#222636] bg-[#06070a] space-y-2">
        <div className="p-2.5 rounded-lg bg-[#11131a] border border-[#22c55e]/20 space-y-1 text-[11px]">
          <div className="flex items-center justify-between text-[#cbd5e1]">
            <span className="text-[#94a3b8] font-medium flex items-center gap-1">
              <User className="w-3 h-3 text-[#86efac]" /> Author:
            </span>
            <span className="text-[#86efac] font-bold font-mono">Narendra Rajput</span>
          </div>
          <div className="flex items-center justify-between text-[#cbd5e1]">
            <span className="text-[#94a3b8] font-medium">Created:</span>
            <span className="text-white font-mono font-medium">AI Digital Investigator</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 ${backendOnline ? "text-[#10b981] animate-pulse" : "text-[#ef4444]"}`} />
            <span className="text-[#cbd5e1] font-mono text-[11px]">
              Engine: {backendOnline ? "ONLINE" : "DISCONNECTED"}
            </span>
          </div>
          <Database className="w-3.5 h-3.5 text-[#94a3b8]" />
        </div>
      </div>
    </aside>
  );
};
