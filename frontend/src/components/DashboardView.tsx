import React from "react";
import {
  FolderGit2,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Upload,
  Bot,
} from "lucide-react";
import type { DashboardStats, Investigation, Evidence } from "../types";

interface DashboardViewProps {
  stats: DashboardStats;
  investigations: Investigation[];
  selectedInvestigation: Investigation | null;
  evidence: Evidence[];
  onSelectInvestigation: (inv: Investigation) => void;
  onOpenCreateModal: () => void;
  onOpenUploadModal: () => void;
  setActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  investigations,
  selectedInvestigation,
  evidence,
  onSelectInvestigation,
  onOpenCreateModal,
  onOpenUploadModal,
  setActiveTab,
}) => {
  const kpiCards = [
    { label: "Active Case Files", value: stats.investigations, icon: FolderGit2, color: "from-green-700 to-emerald-400", glow: "border-[#22c55e]/40" },
    { label: "Uploaded Evidence Files", value: stats.evidence, icon: FileText, color: "from-emerald-700 to-green-500", glow: "border-[#86efac]/40" },
    { label: "Processed Vector Chunks", value: stats.processed, icon: CheckCircle2, color: "from-emerald-600 to-teal-400", glow: "border-[#22c55e]/40" },
    { label: "Pending Processing", value: stats.pending, icon: Clock, color: "from-lime-600 to-green-500", glow: "border-[#84cc16]/40" },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Target Case Overview Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#11131a] via-[#132019] to-[#11131a] border border-[#22c55e]/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#22c55e]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#86efac] text-[10px] font-mono uppercase tracking-widest font-bold">
                Target Active Investigation
              </span>
            </div>

            {selectedInvestigation ? (
              <div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">{selectedInvestigation.title}</h3>
                <p className="text-sm text-[#cbd5e1] mt-1 max-w-2xl">{selectedInvestigation.description || "No specific case description provided."}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-[#94a3b8] font-mono">
                  <span>ID: CASE-#{selectedInvestigation.id}</span>
                  <span>STATUS: {selectedInvestigation.status || "Active"}</span>
                  <span>CREATED: {selectedInvestigation.created_at ? new Date(selectedInvestigation.created_at).toLocaleDateString() : "Recent"}</span>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-white">No Target Case Selected</h3>
                <p className="text-sm text-[#cbd5e1] mt-1">Select an active investigation case to start analyzing evidence files.</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2.5 rounded-xl bg-[#181b26] hover:bg-[#1b2a20] border border-[#22c55e]/30 text-white text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 text-[#86efac]" /> New Case
            </button>
            <button
              onClick={onOpenUploadModal}
              disabled={!selectedInvestigation}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#86efac] to-[#22c55e] text-black font-extrabold text-xs flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-[#22c55e]/20"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" /> Add Evidence
            </button>
            <button
              onClick={() => setActiveTab("ai_chat")}
              disabled={!selectedInvestigation}
              className="px-4 py-2.5 rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/40 text-[#86efac] hover:bg-[#22c55e]/25 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Bot className="w-4 h-4" /> AI Forensic Assistant
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-xl glass-card flex items-center justify-between border ${kpi.glow}`}
            >
              <div>
                <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">{kpi.label}</p>
                <h4 className="text-2xl font-extrabold text-white mt-1 font-mono">{kpi.value}</h4>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-lg shadow-[#22c55e]/15`}>
                <Icon className="w-6 h-6 text-black stroke-[2.5]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Case Files & Recent Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases Table */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-[#222636] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-[#86efac]" /> Active Case Index
            </h3>
            <button
              onClick={() => setActiveTab("cases")}
              className="text-xs text-[#86efac] hover:underline flex items-center gap-1 font-medium"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#cbd5e1]">
              <thead className="bg-[#11131a] text-[#94a3b8] font-mono text-[10px] uppercase">
                <tr>
                  <th className="p-3">Case ID</th>
                  <th className="p-3">Case Title</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222636]">
                {investigations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-[#94a3b8]">
                      No investigation cases found. Click "New Case" to create one.
                    </td>
                  </tr>
                ) : (
                  investigations.slice(0, 5).map((inv) => {
                    const isSelected = selectedInvestigation?.id === inv.id;
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => onSelectInvestigation(inv)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-[#22c55e]/15" : "hover:bg-[#181b26]"
                        }`}
                      >
                        <td className="p-3 font-mono text-[#86efac] font-bold">CASE-#{inv.id}</td>
                        <td className="p-3 font-semibold text-white">{inv.title}</td>
                        <td className="p-3">
                          <span className="badge-status active">{inv.status || "Active"}</span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectInvestigation(inv);
                              setActiveTab("vault");
                            }}
                            className="px-2.5 py-1 rounded bg-[#181b26] hover:bg-[#86efac] hover:text-black text-white text-[11px] font-semibold transition-all"
                          >
                            Open Locker
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Evidence Feed Sidebar */}
        <div className="glass-panel p-5 rounded-2xl border border-[#222636] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#86efac]" /> Recent Evidence
            </h3>
            <button
              onClick={() => setActiveTab("vault")}
              className="text-xs text-[#86efac] hover:underline flex items-center gap-1 font-medium"
            >
              Vault <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {evidence.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#94a3b8] bg-[#11131a] rounded-xl border border-dashed border-[#222636]">
                No evidence files uploaded for the selected case.
              </div>
            ) : (
              evidence.slice(0, 5).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-[#11131a] border border-[#222636] hover:border-[#22c55e]/40 transition-all flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-white truncate">{ev.filename}</p>
                    <p className="text-[10px] text-[#94a3b8] font-mono mt-0.5">
                      HASH: {ev.file_hash ? ev.file_hash.substring(0, 12) + "..." : "N/A"}
                    </p>
                  </div>
                  <span className={`badge-status ${ev.processing_status === "completed" ? "completed" : "processing"}`}>
                    {ev.processing_status || "completed"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
