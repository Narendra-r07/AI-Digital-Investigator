import React, { useState, useEffect } from "react";
import { Network, Users, Building, Globe, Mail, Calendar, RefreshCw, AlertTriangle } from "lucide-react";
import type { Investigation, EntitySummary } from "../types";

interface EntityGraphViewProps {
  selectedInvestigation: Investigation | null;
  apiBase: string;
}

export const EntityGraphView: React.FC<EntityGraphViewProps> = ({
  selectedInvestigation,
  apiBase,
}) => {
  const [entities, setEntities] = useState<EntitySummary>({
    people: [],
    organizations: [],
    ips: [],
    emails: [],
    dates: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchEntities = async () => {
    if (!selectedInvestigation) return;
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/ai/entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investigation_id: selectedInvestigation.id }),
      });

      if (!res.ok) throw new Error("Failed to extract case entities.");
      const data = await res.json();
      setEntities(data.entities || { people: [], organizations: [], ips: [], emails: [], dates: [] });
    } catch (err: any) {
      console.error("Entity extraction failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [selectedInvestigation]);

  const categories = [
    { title: "Identified People / Suspects", items: entities.people, icon: Users, color: "text-[#00f2fe]", bg: "bg-[#00f2fe]/10", border: "border-[#00f2fe]/30" },
    { title: "Organizations & Companies", items: entities.organizations, icon: Building, color: "text-[#7928ca]", bg: "bg-[#7928ca]/10", border: "border-[#7928ca]/30" },
    { title: "Network IP Addresses", items: entities.ips, icon: Globe, color: "text-[#10b981]", bg: "bg-[#10b981]/10", border: "border-[#10b981]/30" },
    { title: "Email Addresses", items: entities.emails, icon: Mail, color: "text-[#86efac]", bg: "bg-[#22c55e]/10", border: "border-[#22c55e]/30" },
    { title: "Significant Dates", items: entities.dates, icon: Calendar, color: "text-[#38bdf8]", bg: "bg-[#38bdf8]/10", border: "border-[#38bdf8]/30" },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-[#1e293b]">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Network className="w-4 h-4 text-[#7928ca]" /> Entity Extraction & OSINT Intelligence
          </h3>
          <p className="text-xs text-[#64748b] mt-0.5">
            Automatic identification of key people, organizations, network IPs, and communications
          </p>
        </div>

        <button
          onClick={fetchEntities}
          disabled={!selectedInvestigation || loading}
          className="px-4 py-2 bg-[#7928ca]/10 border border-[#7928ca]/40 text-[#c084fc] text-xs font-semibold rounded-lg hover:bg-[#7928ca]/20 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Re-scan Entities</span>
        </button>
      </div>

      {!selectedInvestigation ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-dashed border-[#1e293b]">
          <AlertTriangle className="w-10 h-10 text-[#84cc16] mx-auto mb-2" />
          <p className="text-xs text-[#94a3b8]">Select a target case to view extracted entities.</p>
        </div>
      ) : loading ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-[#1e293b]">
          <RefreshCw className="w-8 h-8 text-[#7928ca] animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#c084fc] font-mono">Extracting forensic entities from case documents...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div key={idx} className="glass-panel p-5 rounded-2xl border border-[#1e293b] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cat.color}`} /> {cat.title}
                  </h4>
                  <span className="text-xs font-mono text-[#64748b] bg-[#0f1420] px-2 py-0.5 rounded border border-[#1e293b]">
                    {cat.items ? cat.items.length : 0}
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {!cat.items || cat.items.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-[#64748b] bg-[#0f1420] rounded-xl border border-dashed border-[#1e293b]">
                      No entities detected in this category.
                    </div>
                  ) : (
                    cat.items.map((item, iIdx) => (
                      <div
                        key={iIdx}
                        className={`p-2.5 rounded-xl bg-[#0f1420] border ${cat.border} flex items-center justify-between text-xs text-white font-mono truncate`}
                      >
                        <span className="truncate">{item}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
