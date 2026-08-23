import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import "./App.css";


// ============================================================
// CONFIG
// ============================================================

const API_BASE =
  "http://127.0.0.1:8000";


// ============================================================
// TYPES
// ============================================================

interface Investigation {
  id: number;
  title: string;
  description?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface Evidence {
  id: number;
  investigation_id: number;
  filename: string;
  file_type?: string | null;
  file_size?: number;
  file_hash?: string | null;
  processing_status?: string;
  extracted_text?: string | null;
  uploaded_at?: string;
}

interface SearchResult {
  id?: number;
  evidence_id?: number;
  filename?: string;
  score?: number;
  text?: string;
  content?: string;
  extracted_text?: string;
  [key: string]: any;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  results?: SearchResult[];
}


// ============================================================
// HELPERS
// ============================================================

function formatBytes(bytes: number = 0) {
  if (!bytes) return "0 B";

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return `${(
    bytes /
    Math.pow(1024, index)
  ).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`;
}


function formatDate(date?: string) {
  if (!date) return "Unknown";

  try {
    return new Date(date).toLocaleString();
  } catch {
    return date;
  }
}


function getFileIcon(
  filename: string
) {
  const ext =
    filename
      .split(".")
      .pop()
      ?.toLowerCase();

  if (ext === "pdf") return "PDF";
  if (ext === "doc" || ext === "docx")
    return "DOC";
  if (
    ext === "jpg" ||
    ext === "jpeg" ||
    ext === "png" ||
    ext === "webp"
  )
    return "IMG";
  if (
    ext === "xls" ||
    ext === "xlsx"
  )
    return "XLS";
  if (ext === "txt")
    return "TXT";

  return "FILE";
}


// ============================================================
// API HELPERS
// ============================================================

async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(
    `${API_BASE}${endpoint}`,
    {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : {
              "Content-Type":
                "application/json",
            }),
        ...(options.headers || {}),
      },
    }
  );

  const text =
    await response.text();

  let data: any = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        `Request failed (${response.status})`
    );
  }

  return data;
}


// ============================================================
// APP
// ============================================================

export default function App() {

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [
    investigations,
    setInvestigations,
  ] = useState<Investigation[]>([]);

  const [
    selectedInvestigation,
    setSelectedInvestigation,
  ] =
    useState<Investigation | null>(
      null
    );

  const [
    evidence,
    setEvidence,
  ] = useState<Evidence[]>([]);

  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>([]);

  const [
    question,
    setQuestion,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    evidenceLoading,
    setEvidenceLoading,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    backendOnline,
    setBackendOnline,
  ] = useState(false);

  const [
    showCreate,
    setShowCreate,
  ] = useState(false);

  const [
    showUpload,
    setShowUpload,
  ] = useState(false);

  const [
    newTitle,
    setNewTitle,
  ] = useState("");

  const [
    newDescription,
    setNewDescription,
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    mobileSidebar,
    setMobileSidebar,
  ] = useState(false);

  const chatEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  // ----------------------------------------------------------
  // INITIAL LOAD
  // ----------------------------------------------------------

  useEffect(() => {
    checkBackend();
    loadInvestigations();

    const interval =
      setInterval(
        checkBackend,
        10000
      );

    return () =>
      clearInterval(interval);
  }, []);


  // ----------------------------------------------------------
  // AUTO SCROLL CHAT
  // ----------------------------------------------------------

  useEffect(() => {

    chatEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );

  }, [messages, loading]);


  // ----------------------------------------------------------
  // CHECK BACKEND
  // ----------------------------------------------------------

  async function checkBackend() {

    try {

      await apiRequest(
        "/health"
      );

      setBackendOnline(true);

    } catch {

      setBackendOnline(false);
    }
  }


  // ----------------------------------------------------------
  // LOAD INVESTIGATIONS
  // ----------------------------------------------------------

  async function loadInvestigations() {

    try {

      setError("");

      let data =
        await apiRequest(
          "/investigations"
        );

      if (!Array.isArray(data)) {
        data = [];
      }

      setInvestigations(data);

      // Restore previous selection
      if (data.length > 0) {

        setSelectedInvestigation(
          (current) => {

            if (current) {

              const found =
                data.find(
                  (item: Investigation) =>
                    item.id ===
                    current.id
                );

              if (found) {
                return found;
              }
            }

            return data[0];
          }
        );
      }

    } catch (err: any) {

      setError(
        err.message ||
          "Could not load investigations."
      );
    }
  }


  // ----------------------------------------------------------
  // SELECT INVESTIGATION
  // ----------------------------------------------------------

  async function selectInvestigation(
    investigation: Investigation
  ) {

    setSelectedInvestigation(
      investigation
    );

    setMobileSidebar(false);

    setMessages([]);

    await loadEvidence(
      investigation.id
    );

    addWelcomeMessage(
      investigation
    );
  }


  // ----------------------------------------------------------
  // WELCOME MESSAGE
  // ----------------------------------------------------------

  function addWelcomeMessage(
    investigation: Investigation
  ) {

    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        content:
          `I'm your AI Digital Investigator for "${investigation.title}".\n\nI can analyze the evidence uploaded to this investigation and help you investigate relationships, suspicious information, timelines, people, entities, and other relevant findings.\n\nUpload evidence and ask me a question to begin.`,
        timestamp: new Date(),
      },
    ]);
  }


  // ----------------------------------------------------------
  // LOAD EVIDENCE
  // ----------------------------------------------------------

  async function loadEvidence(
    investigationId: number
  ) {

    try {

      setEvidenceLoading(true);

      const data =
        await apiRequest(
          `/investigations/${investigationId}/evidence`
        );

      setEvidence(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err: any) {

      setEvidence([]);

      setError(
        err.message ||
          "Could not load evidence."
      );

    } finally {

      setEvidenceLoading(false);
    }
  }


  // ----------------------------------------------------------
  // CREATE INVESTIGATION
  // ----------------------------------------------------------

  async function createInvestigation() {

    if (!newTitle.trim()) {

      setError(
        "Enter an investigation title."
      );

      return;
    }

    try {

      setLoading(true);

      setError("");

      const data =
        await apiRequest(
          "/investigations",
          {
            method: "POST",
            body: JSON.stringify({
              title:
                newTitle.trim(),

              description:
                newDescription.trim() ||
                null,
            }),
          }
        );

      const investigation =
        data;

      setInvestigations(
        (previous) => [
          investigation,
          ...previous,
        ]
      );

      setSelectedInvestigation(
        investigation
      );

      setEvidence([]);

      setMessages([]);

      addWelcomeMessage(
        investigation
      );

      setNewTitle("");

      setNewDescription("");

      setShowCreate(false);

    } catch (err: any) {

      setError(
        err.message ||
          "Could not create investigation."
      );

    } finally {

      setLoading(false);
    }
  }


  // ----------------------------------------------------------
  // OPEN FILE PICKER
  // ----------------------------------------------------------

  function openFilePicker() {

    fileInputRef.current?.click();
  }


  // ----------------------------------------------------------
  // FILE SELECTED
  // ----------------------------------------------------------

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {

    const file =
      event.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);

    setShowUpload(true);
  }


  // ----------------------------------------------------------
  // UPLOAD EVIDENCE
  // ----------------------------------------------------------

  async function uploadEvidence() {

    if (
      !selectedInvestigation
    ) {

      setError(
        "Select an investigation first."
      );

      return;
    }

    if (!selectedFile) {

      setError(
        "Select a file first."
      );

      return;
    }

    try {

      setUploading(true);

      setError("");

      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile
      );

      await apiRequest(
        `/investigations/${selectedInvestigation.id}/evidence`,
        {
          method: "POST",
          body: formData,
        }
      );

      setSelectedFile(null);

      setShowUpload(false);

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }

      await loadEvidence(
        selectedInvestigation.id
      );

      addAssistantMessage(
        `Evidence "${selectedFile.name}" has been uploaded successfully. I can now use it as part of this investigation.`
      );

    } catch (err: any) {

      setError(
        err.message ||
          "Evidence upload failed."
      );

    } finally {

      setUploading(false);
    }
  }


  // ----------------------------------------------------------
  // SEND AI QUESTION
  // ----------------------------------------------------------

  async function sendQuestion() {

    const query =
      question.trim();

    if (!query) return;

    if (
      !selectedInvestigation
    ) {

      setError(
        "Select an investigation first."
      );

      return;
    }

    // Add user message
    const userMessage: ChatMessage =
      {
        id: Date.now(),
        role: "user",
        content: query,
        timestamp: new Date(),
      };

    setMessages(
      (previous) => [
        ...previous,
        userMessage,
      ]
    );

    setQuestion("");

    setLoading(true);

    setError("");

    try {

      // ------------------------------------------------------
      // First try the dedicated AI endpoint.
      // ------------------------------------------------------

      let aiResponse: any = null;

      try {

        aiResponse =
          await apiRequest(
            "/ai/chat",
            {
              method: "POST",
              body: JSON.stringify({
                investigation_id:
                  selectedInvestigation.id,

                message:
                  query,

                query:
                  query,
              }),
            }
          );

      } catch {

        // ----------------------------------------------------
        // If /ai/chat is not available,
        // use semantic search as fallback.
        // ----------------------------------------------------

        aiResponse = null;
      }


      // ------------------------------------------------------
      // AI RESPONSE FOUND
      // ------------------------------------------------------

      if (aiResponse) {

        const answer =
          aiResponse.answer ||
          aiResponse.response ||
          aiResponse.message ||
          aiResponse.content ||
          aiResponse.result;

        const results =
          aiResponse.results ||
          aiResponse.matches ||
          [];

        if (answer) {

          addAssistantMessage(
            String(answer),
            Array.isArray(results)
              ? results
              : []
          );

          return;
        }
      }


      // ------------------------------------------------------
      // SEMANTIC SEARCH FALLBACK
      // ------------------------------------------------------

      const search =
        await apiRequest(
          `/investigations/${selectedInvestigation.id}/search?query=${encodeURIComponent(
            query
          )}&top_k=5`
        );


      const results:
        SearchResult[] =
        Array.isArray(
          search?.results
        )
          ? search.results
          : [];


      // ------------------------------------------------------
      // No evidence
      // ------------------------------------------------------

      if (results.length === 0) {

        addAssistantMessage(
          `I couldn't find relevant evidence for "${query}".\n\nTry uploading more evidence or ask a more specific investigation question.`
        );

        return;
      }


      // ------------------------------------------------------
      // Build useful AI-style answer
      // ------------------------------------------------------

      const answer =
        buildInvestigationAnswer(
          query,
          results
        );

      addAssistantMessage(
        answer,
        results
      );

    } catch (err: any) {

      addAssistantMessage(
        "I couldn't complete the investigation request because the AI/search service returned an error."
      );

      setError(
        err.message ||
          "AI request failed."
      );

    } finally {

      setLoading(false);
    }
  }


  // ----------------------------------------------------------
  // BUILD FALLBACK INVESTIGATION ANSWER
  // ----------------------------------------------------------

  function buildInvestigationAnswer(
    query: string,
    results: SearchResult[]
  ) {

    let answer =
      `I found ${results.length} relevant evidence result${
        results.length === 1
          ? ""
          : "s"
      } for "${query}".\n\n`;

    answer +=
      "Here are the most relevant findings:\n\n";

    results
      .slice(0, 5)
      .forEach(
        (
          result,
          index
        ) => {

          const filename =
            result.filename ||
            `Evidence ${index + 1}`;

          const content =
            result.text ||
            result.content ||
            result.extracted_text ||
            "Relevant evidence match found.";

          answer +=
            `${index + 1}. ${filename}\n`;

          answer +=
            `${String(content).slice(
              0,
              500
            )}\n\n`;
        }
      );

    answer +=
      "You can ask a follow-up question and I will search the investigation evidence again.";

    return answer;
  }


  // ----------------------------------------------------------
  // ADD ASSISTANT MESSAGE
  // ----------------------------------------------------------

  function addAssistantMessage(
    content: string,
    results: SearchResult[] = []
  ) {

    setMessages(
      (previous) => [
        ...previous,
        {
          id:
            Date.now() +
            Math.random(),

          role:
            "assistant",

          content,

          timestamp:
            new Date(),

          results,
        },
      ]
    );
  }


  // ----------------------------------------------------------
  // DELETE EVIDENCE
  // ----------------------------------------------------------

  async function deleteEvidence(
    evidenceId: number
  ) {

    const confirmed =
      window.confirm(
        "Delete this evidence file?"
      );

    if (!confirmed) return;

    try {

      await apiRequest(
        `/evidence/${evidenceId}`,
        {
          method: "DELETE",
        }
      );

      if (
        selectedInvestigation
      ) {

        await loadEvidence(
          selectedInvestigation.id
        );
      }

    } catch (err: any) {

      setError(
        err.message ||
          "Could not delete evidence."
      );
    }
  }


  // ----------------------------------------------------------
  // DOWNLOAD EVIDENCE
  // ----------------------------------------------------------

  function downloadEvidence(
    evidenceId: number
  ) {

    window.open(
      `${API_BASE}/evidence/${evidenceId}/download`,
      "_blank"
    );
  }


  // ----------------------------------------------------------
  // KEYBOARD SEND
  // ----------------------------------------------------------

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendQuestion();
    }
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="app-shell">

      {/* ================================================== */}
      {/* SIDEBAR */}
      {/* ================================================== */}

      <aside
        className={`sidebar ${
          mobileSidebar
            ? "sidebar-open"
            : ""
        }`}
      >

        <div className="brand">

          <div className="brand-logo">
            AI
          </div>

          <div>
            <div className="brand-name">
              AI Investigator
            </div>

            <div className="brand-subtitle">
              Digital Intelligence
            </div>
          </div>

        </div>


        <button
          className="new-investigation-btn"
          onClick={() =>
            setShowCreate(true)
          }
        >

          <span>
            +
          </span>

          New Investigation

        </button>


        <div className="sidebar-label">
          INVESTIGATIONS
        </div>


        <div className="investigation-list">

          {investigations.length ===
          0 ? (

            <div className="empty-sidebar">
              <div className="empty-icon">
                +
              </div>

              <p>
                No investigations
              </p>

              <small>
                Create your first case
              </small>
            </div>

          ) : (

            investigations.map(
              (
                investigation
              ) => (

                <button
                  key={
                    investigation.id
                  }

                  className={`investigation-item ${
                    selectedInvestigation?.id ===
                    investigation.id
                      ? "active"
                      : ""
                  }`}

                  onClick={() =>
                    selectInvestigation(
                      investigation
                    )
                  }
                >

                  <div className="case-icon">
                    ◈
                  </div>

                  <div className="case-info">

                    <div className="case-title">
                      {
                        investigation.title
                      }
                    </div>

                    <div className="case-meta">
                      CASE #
                      {
                        investigation.id
                      }
                    </div>

                  </div>

                  <div className="case-status">
                    ●
                  </div>

                </button>
              )
            )

          )}

        </div>


        <div className="sidebar-bottom">

          <div className="system-status">

            <span
              className={
                backendOnline
                  ? "status-dot online"
                  : "status-dot offline"
              }
            />

            <span>
              Backend
            </span>

            <strong>
              {
                backendOnline
                  ? "ONLINE"
                  : "OFFLINE"
              }
            </strong>

          </div>

        </div>

      </aside>


      {/* ================================================== */}
      {/* MOBILE OVERLAY */}
      {/* ================================================== */}

      {mobileSidebar && (
        <div
          className="mobile-overlay"
          onClick={() =>
            setMobileSidebar(false)
          }
        />
      )}


      {/* ================================================== */}
      {/* MAIN */}
      {/* ================================================== */}

      <main className="main-content">

        {/* ============================================== */}
        {/* TOP BAR */}
        {/* ============================================== */}

        <header className="topbar">

          <button
            className="mobile-menu"
            onClick={() =>
              setMobileSidebar(true)
            }
          >
            ☰
          </button>

          <div>

            <div className="eyebrow">
              ARTIFICIAL INTELLIGENCE
            </div>

            <h1>
              AI Investigator
            </h1>

            <p>
              Investigate evidence with
              intelligent AI analysis.
            </p>

          </div>


          <div className="topbar-actions">

            <div
              className={`connection ${
                backendOnline
                  ? "connected"
                  : ""
              }`}
            >

              <span />

              {
                backendOnline
                  ? "SYSTEM ONLINE"
                  : "OFFLINE"
              }

            </div>

          </div>

        </header>


        {/* ============================================== */}
        {/* ERROR */}
        {/* ============================================== */}

        {error && (

          <div className="error-banner">

            <span>
              !
            </span>

            <div>
              {error}
            </div>

            <button
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>

          </div>

        )}


        {/* ============================================== */}
        {/* MAIN GRID */}
        {/* ============================================== */}

        <div className="workspace">


          {/* ============================================ */}
          {/* CHAT PANEL */}
          {/* ============================================ */}

          <section className="chat-panel">

            {/* Chat Header */}

            <div className="chat-header">

              <div className="ai-identity">

                <div className="ai-avatar">
                  ✦
                </div>

                <div>

                  <div className="ai-title">
                    AI Investigation
                  </div>

                  <div className="ai-subtitle">

                    {selectedInvestigation
                      ? selectedInvestigation.title
                      : "No case selected"}

                  </div>

                </div>

              </div>


              <div className="ai-online">

                <span />

                AI READY

              </div>

            </div>


            {/* Chat Messages */}

            <div className="chat-messages">

              {!selectedInvestigation ? (

                <div className="welcome-screen">

                  <div className="welcome-icon">
                    ✦
                  </div>

                  <h2>
                    Start an Investigation
                  </h2>

                  <p>
                    Select an investigation
                    from the sidebar or create
                    a new one to begin.
                  </p>

                  <button
                    onClick={() =>
                      setShowCreate(true)
                    }
                  >
                    Create Investigation
                  </button>

                </div>

              ) : messages.length ===
                0 ? (

                <div className="welcome-screen">

                  <div className="welcome-icon">
                    ✦
                  </div>

                  <h2>
                    How can I help investigate?
                  </h2>

                  <p>
                    Upload evidence and ask
                    questions about your case.
                  </p>

                  <div className="suggestions">

                    <button
                      onClick={() =>
                        setQuestion(
                          "Summarize the available evidence"
                        )
                      }
                    >
                      Summarize evidence
                    </button>

                    <button
                      onClick={() =>
                        setQuestion(
                          "Find suspicious or important information"
                        )
                      }
                    >
                      Find suspicious information
                    </button>

                    <button
                      onClick={() =>
                        setQuestion(
                          "What important entities are present?"
                        )
                      }
                    >
                      Find entities
                    </button>

                  </div>

                </div>

              ) : (

                messages.map(
                  (message) => (

                    <div
                      key={
                        message.id
                      }

                      className={`message-row ${
                        message.role
                      }`}
                    >

                      {message.role ===
                        "assistant" && (

                        <div className="message-avatar">
                          ✦
                        </div>

                      )}


                      <div className="message-content">

                        <div className="message-label">

                          {
                            message.role ===
                            "assistant"
                              ? "AI INVESTIGATOR"
                              : "YOU"
                          }

                        </div>

                        <div className="message-bubble">

                          {message.content
                            .split("\n")
                            .map(
                              (
                                line,
                                index
                              ) => (

                                <React.Fragment
                                  key={
                                    index
                                  }
                                >

                                  {line}

                                  {index <
                                    message.content.split(
                                      "\n"
                                    ).length -
                                      1 && (
                                    <br />
                                  )}

                                </React.Fragment>
                              )
                            )}

                        </div>


                        {/* Search results */}

                        {message.results &&
                          message.results.length >
                            0 && (

                            <div className="result-cards">

                              <div className="result-title">
                                RELEVANT EVIDENCE
                              </div>

                              {message.results
                                .slice(
                                  0,
                                  3
                                )
                                .map(
                                  (
                                    result,
                                    index
                                  ) => (

                                    <div
                                      className="result-card"
                                      key={
                                        index
                                      }
                                    >

                                      <div className="result-file-icon">
                                        {getFileIcon(
                                          result.filename ||
                                            ""
                                        )}
                                      </div>

                                      <div>

                                        <strong>
                                          {
                                            result.filename ||
                                            `Evidence ${
                                              index +
                                              1
                                            }`
                                          }
                                        </strong>

                                        <p>
                                          {(
                                            result.text ||
                                            result.content ||
                                            result.extracted_text ||
                                            "Relevant match."
                                          ).slice(
                                            0,
                                            220
                                          )}
                                        </p>

                                      </div>

                                    </div>

                                  )
                                )}

                            </div>

                          )}

                        <div className="message-time">
                          {message.timestamp.toLocaleTimeString(
                            [],
                            {
                              hour:
                                "2-digit",

                              minute:
                                "2-digit",
                            }
                          )}
                        </div>

                      </div>

                    </div>

                  )
                )

              )}


              {loading && (

                <div className="message-row assistant">

                  <div className="message-avatar">
                    ✦
                  </div>

                  <div className="message-content">

                    <div className="message-label">
                      AI INVESTIGATOR
                    </div>

                    <div className="typing-bubble">

                      <span />
                      <span />
                      <span />

                      <em>
                        Investigating...
                      </em>

                    </div>

                  </div>

                </div>

              )}

              <div
                ref={chatEndRef}
              />

            </div>


            {/* ======================================== */}
            {/* CHAT INPUT */}
            {/* ======================================== */}

            <div className="chat-input-area">

              <div className="input-wrapper">

                <textarea
                  value={question}
                  onChange={(event) =>
                    setQuestion(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  placeholder={
                    selectedInvestigation
                      ? "Ask anything about this investigation..."
                      : "Select an investigation first..."
                  }
                  disabled={
                    !selectedInvestigation ||
                    loading
                  }
                  rows={1}
                />

                <button
                  className="send-button"
                  onClick={
                    sendQuestion
                  }
                  disabled={
                    !question.trim() ||
                    !selectedInvestigation ||
                    loading
                  }
                >
                  ↑
                </button>

              </div>

              <div className="input-footer">

                <span>
                  Enter to send • Shift +
                  Enter for new line
                </span>

                <span>
                  AI may analyze uploaded
                  evidence
                </span>

              </div>

            </div>

          </section>


          {/* ============================================ */}
          {/* RIGHT PANEL */}
          {/* ============================================ */}

          <aside className="right-panel">


            {/* ======================================== */}
            {/* CASE CARD */}
            {/* ======================================== */}

            <div className="panel-card">

              <div className="panel-card-header">

                <div>

                  <div className="panel-eyebrow">
                    INVESTIGATION
                  </div>

                  <h3>
                    Case Intelligence
                  </h3>

                </div>

                <div className="case-number">

                  {selectedInvestigation
                    ? `#${selectedInvestigation.id}`
                    : "--"}

                </div>

              </div>


              {selectedInvestigation ? (

                <>

                  <div className="case-detail-title">
                    {
                      selectedInvestigation.title
                    }
                  </div>

                  <div className="case-description">

                    {
                      selectedInvestigation.description ||
                      "No investigation description provided."
                    }

                  </div>

                  <div className="case-status-large">

                    <span />

                    {
                      selectedInvestigation.status ||
                      "ACTIVE"
                    }

                  </div>

                </>

              ) : (

                <div className="no-case">
                  No investigation selected.
                </div>

              )}

            </div>


            {/* ======================================== */}
            {/* EVIDENCE CARD */}
            {/* ======================================== */}

            <div className="panel-card evidence-card">

              <div className="panel-card-header">

                <div>

                  <div className="panel-eyebrow">
                    EVIDENCE VAULT
                  </div>

                  <h3>
                    Evidence
                  </h3>

                </div>

                <div className="evidence-count">
                  {evidence.length}
                </div>

              </div>


              <button
                className="upload-button"
                onClick={
                  openFilePicker
                }
                disabled={
                  !selectedInvestigation
                }
              >

                <span>
                  +
                </span>

                Upload Evidence

              </button>


              <input
                ref={
                  fileInputRef
                }
                type="file"
                hidden
                onChange={
                  handleFileChange
                }
              />


              <div className="evidence-list">

                {evidenceLoading ? (

                  <div className="loading-evidence">

                    <div className="spinner" />

                    Loading evidence...

                  </div>

                ) : evidence.length ===
                  0 ? (

                  <div className="empty-evidence">

                    <div className="empty-file-icon">
                      ◫
                    </div>

                    <strong>
                      No evidence yet
                    </strong>

                    <span>
                      Upload files to begin
                      your investigation.
                    </span>

                  </div>

                ) : (

                  evidence.map(
                    (item) => (

                      <div
                        className="evidence-item"
                        key={
                          item.id
                        }
                      >

                        <div className="file-icon">
                          {getFileIcon(
                            item.filename
                          )}
                        </div>

                        <div className="evidence-info">

                          <div className="evidence-name">
                            {
                              item.filename
                            }
                          </div>

                          <div className="evidence-meta">

                            {formatBytes(
                              item.file_size
                            )}

                            {" • "}

                            {
                              item.processing_status ||
                              "pending"
                            }

                          </div>

                        </div>

                        <div className="evidence-actions">

                          <button
                            title="Download"
                            onClick={() =>
                              downloadEvidence(
                                item.id
                              )
                            }
                          >
                            ↓
                          </button>

                          <button
                            title="Delete"
                            onClick={() =>
                              deleteEvidence(
                                item.id
                              )
                            }
                          >
                            ×
                          </button>

                        </div>

                      </div>

                    )
                  )

                )}

              </div>

            </div>


            {/* ======================================== */}
            {/* AI STATUS */}
            {/* ======================================== */}

            <div className="panel-card system-card">

              <div className="panel-eyebrow">
                AI SYSTEM
              </div>

              <div className="system-row">

                <div className="system-icon">
                  ✦
                </div>

                <div>

                  <strong>
                    Investigation AI
                  </strong>

                  <span>
                    {
                      backendOnline
                        ? "Ready for analysis"
                        : "Backend unavailable"
                    }
                  </span>

                </div>

                <div
                  className={
                    backendOnline
                      ? "system-online"
                      : "system-offline"
                  }
                >
                  ●
                </div>

              </div>

            </div>


          </aside>

        </div>

      </main>


      {/* ================================================== */}
      {/* CREATE MODAL */}
      {/* ================================================== */}

      {showCreate && (

        <div className="modal-overlay">

          <div className="modal">

            <button
              className="modal-close"
              onClick={() =>
                setShowCreate(false)
              }
            >
              ×
            </button>

            <div className="modal-icon">
              ◈
            </div>

            <div className="modal-eyebrow">
              NEW INVESTIGATION
            </div>

            <h2>
              Create a case
            </h2>

            <p>
              Start a new digital
              investigation.
            </p>


            <label>
              Investigation title
            </label>

            <input
              value={newTitle}
              onChange={(event) =>
                setNewTitle(
                  event.target.value
                )
              }
              placeholder="e.g. Financial Fraud Investigation"
              autoFocus
            />


            <label>
              Description
            </label>

            <textarea
              value={
                newDescription
              }
              onChange={(event) =>
                setNewDescription(
                  event.target.value
                )
              }
              placeholder="Describe the purpose of this investigation..."
              rows={4}
            />


            <div className="modal-actions">

              <button
                className="secondary-button"
                onClick={() =>
                  setShowCreate(false)
                }
              >
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={
                  createInvestigation
                }
                disabled={
                  loading ||
                  !newTitle.trim()
                }
              >
                {loading
                  ? "Creating..."
                  : "Create Investigation"}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ================================================== */}
      {/* UPLOAD MODAL */}
      {/* ================================================== */}

      {showUpload && (

        <div className="modal-overlay">

          <div className="modal upload-modal">

            <button
              className="modal-close"
              onClick={() => {

                if (!uploading) {

                  setShowUpload(
                    false
                  );

                  setSelectedFile(
                    null
                  );
                }

              }}
            >
              ×
            </button>

            <div className="modal-icon upload-icon">
              ↑
            </div>

            <div className="modal-eyebrow">
              EVIDENCE VAULT
            </div>

            <h2>
              Upload Evidence
            </h2>

            <p>
              Add evidence to the selected
              investigation.
            </p>


            {selectedFile && (

              <div className="selected-file">

                <div className="selected-file-icon">
                  {getFileIcon(
                    selectedFile.name
                  )}
                </div>

                <div>

                  <strong>
                    {
                      selectedFile.name
                    }
                  </strong>

                  <span>
                    {
                      formatBytes(
                        selectedFile.size
                      )
                    }
                  </span>

                </div>

                <div className="file-ready">
                  ✓
                </div>

              </div>

            )}


            <div className="upload-dropzone">

              <div className="drop-icon">
                ↑
              </div>

              <strong>
                Ready to upload
              </strong>

              <span>
                Evidence will be stored
                securely in the case.
              </span>

            </div>


            <div className="modal-actions">

              <button
                className="secondary-button"
                disabled={
                  uploading
                }
                onClick={() => {

                  setShowUpload(
                    false
                  );

                  setSelectedFile(
                    null
                  );

                }}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                disabled={
                  uploading ||
                  !selectedFile
                }
                onClick={
                  uploadEvidence
                }
              >

                {uploading ? (
                  <>
                    <span className="button-spinner" />
                    Uploading...
                  </>
                ) : (
                  <>
                    ↑ Upload Evidence
                  </>
                )}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}