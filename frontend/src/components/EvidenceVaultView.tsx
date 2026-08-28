import React, { useState } from "react";
import {
  Upload,
  Search,
  Trash2,
  Eye,
  AlertTriangle,
  FileCheck,
  X,
} from "lucide-react";
import type { Evidence, Investigation } from "../types";

interface EvidenceVaultViewProps {
  evidence: Evidence[];
  selectedInvestigation: Investigation | null;
  onOpenUploadModal: () => void;
  onDeleteEvidence: (id: number) => void;
}

export const EvidenceVaultView: React.FC<EvidenceVaultViewProps> = ({
  evidence,
  selectedInvestigation,
  onOpenUploadModal,
  onDeleteEvidence,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [previewItem, setPreviewItem] = useState<Evidence | null>(null);

  const filtered = evidence.filter((ev) =>
    ev.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Top Header & Upload Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-[#183324]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#4ed19c] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search evidence files by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0b1710] border border-[#183324] rounded-lg text-xs text-white placeholder-[#4ed19c] focus:outline-none focus:border-[#00ff87]"
          />
        </div>

        <button
          onClick={onOpenUploadModal}
          disabled={!selectedInvestigation}
          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-[#00ff87] to-[#10b981] text-black font-extrabold text-xs rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-md shadow-[#00ff87]/20"
        >
          <Upload className="w-4 h-4 stroke-[2.5]" /> Upload Evidence File
        </button>
      </div>

      {/* Case Vault Info */}
      {selectedInvestigation ? (
        <div className="flex items-center justify-between text-xs text-[#a7f3d0] px-2 font-mono">
          <span>Active Case Locker: #{selectedInvestigation.id} - {selectedInvestigation.title}</span>
          <span>Total Evidence Items: {filtered.length}</span>
        </div>
      ) : (
        <div className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl text-xs text-[#f87171] font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Please select a target case file to view evidence.
        </div>
      )}

      {/* Evidence Table */}
      <div className="glass-panel rounded-2xl border border-[#183324] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#a7f3d0]">
            <thead className="bg-[#0b1710] text-[#4ed19c] font-mono text-[10px] uppercase border-b border-[#183324]">
              <tr>
                <th className="p-4">Filename & Format</th>
                <th className="p-4">SHA-256 Hash</th>
                <th className="p-4">File Size</th>
                <th className="p-4">RAG Vector Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#183324]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[#4ed19c]">
                    No evidence files found in this vault. Click "Upload Evidence File" to add files.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#12241a] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00ff87]/15 border border-[#00ff87]/30 flex items-center justify-center text-[#00ff87] font-mono font-extrabold text-[10px]">
                          {item.file_type ? item.file_type.toUpperCase().replace(".", "") : "FILE"}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{item.filename}</p>
                          <p className="text-[10px] text-[#4ed19c]">
                            Uploaded: {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : "Recently"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-[#00ff87] font-semibold">
                      {item.file_hash ? `${item.file_hash.substring(0, 16)}...` : "N/A"}
                    </td>
                    <td className="p-4 font-mono text-xs">{formatBytes(item.file_size)}</td>
                    <td className="p-4">
                      <span className={`badge-status ${item.processing_status === "completed" ? "completed" : "processing"}`}>
                        {item.processing_status || "completed"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewItem(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#183324] hover:bg-[#00ff87] hover:text-black text-white text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect Text
                        </button>
                        <button
                          onClick={() => onDeleteEvidence(item.id)}
                          className="p-1.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#f87171] hover:bg-[#ef4444]/20 text-xs transition-all"
                          title="Delete Evidence"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Text Content Inspector Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1710] border border-[#00ff87]/40 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#183324] flex items-center justify-between bg-[#12241a]">
              <div className="flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-[#00ff87]" />
                <div>
                  <h3 className="font-bold text-white text-sm">{previewItem.filename}</h3>
                  <p className="text-[10px] text-[#a7f3d0] font-mono">
                    HASH: {previewItem.file_hash || "N/A"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-lg bg-[#183324] text-[#a7f3d0] hover:text-white hover:bg-[#204531] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 flex-1 overflow-y-auto bg-[#050b07] font-mono-code text-xs text-[#a7f3d0] leading-relaxed whitespace-pre-wrap">
              {previewItem.extracted_text || "No extracted text available for this file."}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#183324] bg-[#0b1710] flex items-center justify-between text-xs text-[#4ed19c]">
              <span>Size: {formatBytes(previewItem.file_size)}</span>
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-1.5 rounded-lg bg-[#183324] text-white text-xs font-semibold hover:bg-[#204531] transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
