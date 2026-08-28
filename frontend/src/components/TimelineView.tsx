import React, { useState, useEffect } from "react";
import { Clock, RefreshCw, AlertTriangle, Calendar } from "lucide-react";
import type { Investigation, TimelineEvent } from "../types";

interface TimelineViewProps {
  selectedInvestigation: Investigation | null;
  apiBase: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  selectedInvestigation,
  apiBase,
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTimeline = async () => {
    if (!selectedInvestigation) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/ai/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investigation_id: selectedInvestigation.id }),
      });

      if (!res.ok) throw new Error("Failed to extract event timeline.");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err: any) {
      setError(err.message || "Timeline extraction failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [selectedInvestigation]);

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-[#122e1b]">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00e676]" /> Chronological Event Timeline
          </h3>
          <p className="text-xs text-[#86efac] mt-0.5">
            Automated date & timestamp event extraction from case evidence files
          </p>
        </div>

        <button
          onClick={fetchTimeline}
          disabled={!selectedInvestigation || loading}
          className="px-4 py-2 bg-[#00e676]/15 border border-[#00e676]/40 text-[#00e676] text-xs font-semibold rounded-lg hover:bg-[#00e676]/25 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Re-analyze Timeline</span>
        </button>
      </div>

      {!selectedInvestigation ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-dashed border-[#122e1b]">
          <AlertTriangle className="w-10 h-10 text-[#84cc16] mx-auto mb-2" />
          <p className="text-xs text-[#86efac]">Select a target case to view extracted chronological events.</p>
        </div>
      ) : loading ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-[#122e1b]">
          <RefreshCw className="w-8 h-8 text-[#00e676] animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#00e676] font-mono">Parsing evidence logs & building event timeline...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl text-xs text-[#f87171]">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-dashed border-[#122e1b]">
          <Calendar className="w-10 h-10 text-[#34d399] mx-auto mb-2" />
          <p className="text-xs text-[#86efac]">No explicit dates or timestamps found in current case evidence.</p>
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-[#122e1b] space-y-6 my-4">
          {events.map((ev, idx) => (
            <div key={idx} className="relative group">
              {/* Timeline Dot */}
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#030704] border-2 border-[#00e676] group-hover:bg-[#00e676] transition-all" />

              <div className="p-4 rounded-xl glass-card border border-[#122e1b] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#00e676] font-bold px-2 py-0.5 rounded bg-[#00e676]/15 border border-[#00e676]/30">
                    {ev.date}
                  </span>
                  <span className="text-[#34d399]">{ev.source || "Evidence File"}</span>
                </div>

                <p className="text-xs text-white leading-relaxed font-sans">{ev.event}</p>

                {ev.significance && (
                  <p className="text-[11px] text-[#86efac] italic bg-[#07120a] p-2 rounded border border-[#122e1b]">
                    Significance: {ev.significance}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
