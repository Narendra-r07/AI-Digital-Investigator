import React, { useState, useEffect } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { InvestigationsView } from "./components/InvestigationsView";
import { EvidenceVaultView } from "./components/EvidenceVaultView";
import { AIChatView } from "./components/AIChatView";
import { TimelineView } from "./components/TimelineView";
import type { Investigation, Evidence, ChatMessage, DashboardStats } from "./types";
import { Plus, Upload, X, FileText } from "lucide-react";

const API_BASE = (
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    investigations: 0,
    evidence: 0,
    processed: 0,
    pending: 0,
    failed: 0,
  });

  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    checkBackend();
    loadInvestigations();
    loadStats();
    const interval = setInterval(() => {
      checkBackend();
      loadStats();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedInvestigation) {
      loadEvidence(selectedInvestigation.id);
    } else {
      setEvidence([]);
    }
  }, [selectedInvestigation]);

  const checkBackend = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn("Could not fetch dashboard stats", e);
    }
  };

  const loadInvestigations = async () => {
    try {
      const res = await fetch(`${API_BASE}/investigations`);
      if (res.ok) {
        const data = await res.json();
        setInvestigations(data || []);
        if (data && data.length > 0 && !selectedInvestigation) {
          setSelectedInvestigation(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load investigations", e);
    }
  };

  const loadEvidence = async (invId: number) => {
    try {
      const res = await fetch(`${API_BASE}/investigations/${invId}/evidence`);
      if (res.ok) {
        const data = await res.json();
        setEvidence(data || []);
      }
    } catch (e) {
      console.error("Failed to load evidence", e);
    }
  };

  const handleCreateInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setModalError("Case title is required.");
      return;
    }
    setModalError("");
    try {
      const res = await fetch(`${API_BASE}/investigations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to create case.");
      }

      const created = await res.json();
      setInvestigations((prev) => [created, ...prev]);
      setSelectedInvestigation(created);
      setNewTitle("");
      setNewDescription("");
      setShowCreateModal(false);
      loadStats();
    } catch (err: any) {
      setModalError(err.message || "Failed to create case.");
    }
  };

  const handleDeleteInvestigation = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete Case #${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/investigations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const updated = investigations.filter((inv) => inv.id !== id);
        setInvestigations(updated);
        if (selectedInvestigation?.id === id) {
          setSelectedInvestigation(updated.length > 0 ? updated[0] : null);
        }
        loadStats();
      }
    } catch (e) {
      console.error("Failed to delete investigation", e);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedInvestigation) return;
    setUploading(true);
    setModalError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`${API_BASE}/investigations/${selectedInvestigation.id}/evidence`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to upload evidence.");
      }

      await loadEvidence(selectedInvestigation.id);
      setSelectedFile(null);
      setShowUploadModal(false);
      loadStats();
    } catch (err: any) {
      setModalError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteEvidence = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete this evidence item?`)) return;
    try {
      const res = await fetch(`${API_BASE}/investigations/evidence/${id}`, {
        method: "DELETE",
      });
      if (res.ok && selectedInvestigation) {
        loadEvidence(selectedInvestigation.id);
        loadStats();
      }
    } catch (e) {
      console.error("Failed to delete evidence", e);
    }
  };

  const handleSendMessage = async (questionText: string) => {
    if (!selectedInvestigation || !questionText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: questionText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const payload = {
        question: questionText,
        investigation_id: selectedInvestigation.id,
        conversation: messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "AI analysis failed.");
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || "No response received.",
        timestamp: new Date(),
        model: data.model,
        evidence: data.evidence,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `⚠️ Error during AI analysis: ${err.message || "Request failed."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050b07] text-white">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedInvestigation={selectedInvestigation}
        onOpenCreateModal={() => {
          setModalError("");
          setShowCreateModal(true);
        }}
        backendOnline={backendOnline}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <Header
          activeTab={activeTab}
          selectedInvestigation={selectedInvestigation}
          investigations={investigations}
          onSelectInvestigation={setSelectedInvestigation}
          onOpenUploadModal={() => {
            setModalError("");
            setShowUploadModal(true);
          }}
          backendOnline={backendOnline}
        />

        <main className="flex-1 overflow-hidden relative">
          {activeTab === "dashboard" && (
            <DashboardView
              stats={stats}
              investigations={investigations}
              selectedInvestigation={selectedInvestigation}
              evidence={evidence}
              onSelectInvestigation={setSelectedInvestigation}
              onOpenCreateModal={() => {
                setModalError("");
                setShowCreateModal(true);
              }}
              onOpenUploadModal={() => {
                setModalError("");
                setShowUploadModal(true);
              }}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "cases" && (
            <InvestigationsView
              investigations={investigations}
              selectedInvestigation={selectedInvestigation}
              onSelectInvestigation={setSelectedInvestigation}
              onOpenCreateModal={() => {
                setModalError("");
                setShowCreateModal(true);
              }}
              onDeleteInvestigation={handleDeleteInvestigation}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "vault" && (
            <EvidenceVaultView
              evidence={evidence}
              selectedInvestigation={selectedInvestigation}
              onOpenUploadModal={() => {
                setModalError("");
                setShowUploadModal(true);
              }}
              onDeleteEvidence={handleDeleteEvidence}
            />
          )}

          {activeTab === "ai_chat" && (
            <AIChatView
              messages={messages}
              selectedInvestigation={selectedInvestigation}
              evidence={evidence}
              onSendMessage={handleSendMessage}
              loading={loading}
            />
          )}

          {activeTab === "timeline" && (
            <TimelineView
              selectedInvestigation={selectedInvestigation}
              apiBase={API_BASE}
            />
          )}
        </main>
      </div>

      {/* Create New Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1710] border border-[#00ff87]/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#183324] pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#00ff87]" /> Create Investigation Case
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#a7f3d0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg text-xs text-[#f87171]">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateInvestigation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#a7f3d0] uppercase mb-1">Case Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Operation Cyber-Shield 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050b07] border border-[#183324] rounded-lg text-xs text-white focus:outline-none focus:border-[#00ff87]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a7f3d0] uppercase mb-1">Case Description</label>
                <textarea
                  rows={3}
                  placeholder="Details regarding suspicious activities, target scope, or objectives..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050b07] border border-[#183324] rounded-lg text-xs text-white focus:outline-none focus:border-[#00ff87]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#183324] text-white text-xs font-semibold rounded-lg hover:bg-[#204531]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#00ff87] to-[#10b981] text-black font-extrabold text-xs rounded-lg hover:opacity-90 shadow-md shadow-[#00ff87]/20"
                >
                  Initialize Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Evidence Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1710] border border-[#00ff87]/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#183324] pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#00ff87]" /> Upload Evidence File
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-[#a7f3d0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg text-xs text-[#f87171]">
                {modalError}
              </div>
            )}

            <form onSubmit={handleUploadEvidence} className="space-y-4">
              <div className="p-6 border-2 border-dashed border-[#183324] hover:border-[#00ff87]/50 rounded-xl text-center bg-[#050b07] cursor-pointer transition-all">
                <FileText className="w-8 h-8 text-[#00ff87] mx-auto mb-2" />
                <p className="text-xs font-semibold text-white">Select evidence file</p>
                <p className="text-[10px] text-[#4ed19c] mt-1">
                  Supported formats: .txt, .pdf, .docx, .md, .csv, .log, .json (Max 25MB)
                </p>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-3 block w-full text-xs text-[#a7f3d0] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#00ff87]/20 file:text-[#00ff87] hover:file:bg-[#00ff87]/30"
                />
              </div>

              {selectedFile && (
                <div className="p-3 bg-[#050b07] border border-[#00ff87]/30 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-mono text-white truncate">{selectedFile.name}</span>
                  <span className="text-[10px] text-[#4ed19c]">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-[#183324] text-white text-xs font-semibold rounded-lg hover:bg-[#204531]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="px-4 py-2 bg-gradient-to-r from-[#00ff87] to-[#10b981] text-black font-extrabold text-xs rounded-lg hover:opacity-90 disabled:opacity-50 shadow-md shadow-[#00ff87]/20 flex items-center gap-2"
                >
                  {uploading ? (
                    <>Processing & Indexing...</>
                  ) : (
                    <>Upload & Vector Index</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
