import React, { useState } from "react";
import { FolderGit2, Search, Plus, Trash2, ArrowRight } from "lucide-react";
import type { Investigation } from "../types";

interface InvestigationsViewProps {
  investigations: Investigation[];
  selectedInvestigation: Investigation | null;
  onSelectInvestigation: (inv: Investigation) => void;
  onOpenCreateModal: () => void;
  onDeleteInvestigation: (id: number) => void;
  setActiveTab: (tab: string) => void;
}

export const InvestigationsView: React.FC<InvestigationsViewProps> = ({
  investigations,
  selectedInvestigation,
  onSelectInvestigation,
  onOpenCreateModal,
  onDeleteInvestigation,
  setActiveTab,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = investigations.filter(
    (inv) =>
      inv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.description && inv.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-[#122e1b]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#34d399] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Filter case files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#07120a] border border-[#122e1b] rounded-lg text-xs text-white placeholder-[#34d399] focus:outline-none focus:border-[#00e676]"
          />
        </div>

        <button
          onClick={onOpenCreateModal}
          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-[#00e676] to-[#10b981] text-black font-extrabold text-xs rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md shadow-[#00e676]/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Create Investigation Case
        </button>
      </div>

      {/* Grid of Investigation Cases */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center glass-panel rounded-2xl border border-dashed border-[#122e1b]">
            <FolderGit2 className="w-12 h-12 text-[#34d399] mx-auto mb-3" />
            <h4 className="text-base font-semibold text-white">No investigation cases found</h4>
            <p className="text-xs text-[#86efac] mt-1">Start by creating a new digital forensic case file.</p>
            <button
              onClick={onOpenCreateModal}
              className="mt-4 px-4 py-2 bg-[#00e676]/15 border border-[#00e676]/40 text-[#00e676] text-xs font-semibold rounded-lg hover:bg-[#00e676]/25 transition-all"
            >
              Create First Case
            </button>
          </div>
        ) : (
          filtered.map((inv) => {
            const isSelected = selectedInvestigation?.id === inv.id;
            return (
              <div
                key={inv.id}
                className={`p-6 rounded-2xl glass-card flex flex-col justify-between border relative overflow-hidden transition-all ${
                  isSelected ? "border-[#00e676] bg-[#00e676]/10 shadow-lg shadow-[#00e676]/15" : "border-[#122e1b]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-[#00e676]">CASE-#{inv.id}</span>
                    <span className="badge-status active">{inv.status || "Active"}</span>
                  </div>

                  <h3 className="text-lg font-bold text-white tracking-tight line-clamp-1">{inv.title}</h3>
                  <p className="text-xs text-[#86efac] mt-2 line-clamp-3 leading-relaxed">
                    {inv.description || "No description specified for this case."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#122e1b] flex items-center justify-between">
                  <span className="text-[10px] text-[#34d399] font-mono">
                    {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "Recent"}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDeleteInvestigation(inv.id)}
                      className="p-2 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#f87171] hover:bg-[#ef4444]/20 text-xs transition-all"
                      title="Delete Case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        onSelectInvestigation(inv);
                        setActiveTab("vault");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#00e676] text-black font-extrabold text-xs flex items-center gap-1 hover:bg-[#10b981] transition-all shadow-md shadow-[#00e676]/20"
                    >
                      <span>Select Case</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
