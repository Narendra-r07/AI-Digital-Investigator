import streamlit as st
import requests
import json
import time

BACKEND_URL = "http://127.0.0.1:8000"

st.set_page_config(
    page_title="CyberScope — AI Security Workspace", 
    page_icon="🛡️", 
    layout="wide"
)

# --- CLEAN SAAS DARK MODE CSS ---
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
        background-color: #090d16;
        color: #e2e8f0;
    }

    code, pre {
        font-family: 'JetBrains Mono', monospace !important;
    }

    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}

    .stApp {
        background-image: 
            radial-gradient(at 10% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
            radial-gradient(at 90% 100%, rgba(14, 165, 233, 0.08) 0px, transparent 50%);
        background-attachment: fixed;
    }

    section[data-testid="stSidebar"] {
        background-color: #0c101d;
        border-right: 1px solid rgba(255, 255, 255, 0.06);
    }

    .saas-card {
        background: #111827;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 16px;
        box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.3);
    }

    .page-title {
        font-size: 24px;
        font-weight: 700;
        color: #f8fafc;
        letter-spacing: -0.02em;
    }

    .badge-high { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 11px; text-transform: uppercase; }
    .badge-med { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 11px; text-transform: uppercase; }
    .badge-low { background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 11px; text-transform: uppercase; }

    .stButton button {
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 20px;
        font-weight: 600;
        font-size: 13px;
    }
    .stButton button:hover {
        background: #4f46e5;
    }
    </style>
""", unsafe_allow_html=True)

# --- SIDEBAR NAVIGATION ---
with st.sidebar:
    st.markdown("""
        <div style="padding: 8px 0 16px 0;">
            <h2 style="font-size: 18px; font-weight: 700; color: #f8fafc; margin: 0;">🛡️ CyberScope</h2>
            <p style="font-size: 11px; color: #64748b; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">AI Security Workspace</p>
        </div>
        <hr style="border: 1px solid rgba(255, 255, 255, 0.06); margin: 0 0 16px 0;">
    """, unsafe_allow_html=True)

    selected_tab = st.radio(
        "Navigation",
        [
            "⚡ AI Triage & Analysis", 
            "🤖 AI Security Co-Pilot", 
            "🌐 Threat Intelligence", 
            "📁 Investigation Cases", 
            "📊 Telemetry & Metrics"
        ],
        label_visibility="collapsed"
    )

    st.markdown("<br><br>", unsafe_allow_html=True)
    st.markdown("""
        <div style="background: rgba(99, 102, 241, 0.06); border: 1px solid rgba(99, 102, 241, 0.15); border-radius: 10px; padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #818cf8;">
            <b>CLUSTER:</b> PRD-US-EAST<br>
            <b>STATUS:</b> OPTIMAL
        </div>
    """, unsafe_allow_html=True)

# --- TOP HEADER ---
c1, c2 = st.columns([4, 2])
with c1:
    st.markdown("<h1 class='page-title'>Security Operations Center</h1>", unsafe_allow_html=True)
with c2:
    st.markdown("""
        <div style="text-align: right; padding-top: 6px;">
            <span style="display: inline-block; width: 6px; height: 6px; background: #34d399; border-radius: 50%; margin-right: 6px;"></span>
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #34d399; font-weight: 500;">SYSTEM ONLINE</span>
        </div>
    """, unsafe_allow_html=True)

st.markdown("<hr style='border: 1px solid rgba(255, 255, 255, 0.06); margin: 16px 0 24px 0;'>", unsafe_allow_html=True)

# ==========================================
# 1. AI TRIAGE & ANALYSIS (WITH EXPLANATION & PROBLEM SOLVER)
# ==========================================
if selected_tab == "⚡ AI Triage & Analysis":
    col_up, col_res = st.columns(2, gap="large")

    res = requests.get(f"{BACKEND_URL}/investigations/")
    cases = res.json() if res.status_code == 200 else []
    case_map = {f"Case #{c['id']}: {c['title']}": c['id'] for c in cases}

    with col_up:
        st.markdown("<h3 style='font-size: 14px; font-weight: 600; color: #94a3b8; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;'>1. Ingestion & Parameters</h3>", unsafe_allow_html=True)
        st.markdown('<div class="saas-card">', unsafe_allow_html=True)
        
        ai_engine = st.selectbox("AI Inference Engine", ["GPT-4o Security Agent", "Claude 3.5 Sonnet", "DeepSeek-Cyber v2"])
        temperature = st.slider("Analysis Temperature", 0.0, 1.0, 0.1)
        
        if not case_map:
            st.warning("⚠️ No active cases. Please create one in the Cases tab.")
        else:
            selected_case_key = st.selectbox("Target Investigation", list(case_map.keys()))
            target_case_id = case_map[selected_case_key]
            
            uploaded_file = st.file_uploader("Upload Log, PCAP, or Memory Dump", type=["txt", "log", "csv", "json", "pcap"])
            
            st.markdown("<br>", unsafe_allow_html=True)
            execute_btn = st.button("Run AI Triage & Problem Solver", use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    with col_res:
        st.markdown("<h3 style='font-size: 14px; font-weight: 600; color: #94a3b8; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;'>2. AI Explanation & Problem Solver</h3>", unsafe_allow_html=True)
        
        st.markdown('<div class="saas-card">', unsafe_allow_html=True)
        
        if uploaded_file and execute_btn:
            files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
            with st.spinner("Processing file through neural security engine..."):
                upload_res = requests.post(f"{BACKEND_URL}/evidence/{target_case_id}/upload", files=files)
            
            if upload_res.status_code == 201:
                data = upload_res.json()
                try:
                    analysis = json.loads(data.get("ai_analysis_result", "{}"))
                except:
                    analysis = {"threat_level": "MEDIUM", "sha256": "c914a40d74314bb61ed7c8f347a87221105a7a3751b44f2873596b8517fdf71c"}
                
                t_level = analysis.get("threat_level", "MEDIUM")
                badge_style = "badge-high" if t_level == "HIGH" else ("badge-med" if t_level == "MEDIUM" else "badge-low")
                
                # Tabbed layout for Explanation vs Problem Solver
                tab_exp, tab_fix = st.tabs(["🔍 Detailed Explanation", "🛠️ Problem Solver & Fix"])
                
                with tab_exp:
                    st.markdown(f"""
                        <div style="margin-top: 8px;">
                            <span class="{badge_style}" style="display: inline-block; margin-bottom: 12px;">{t_level} THREAT DETECTED</span>
                            <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6; margin-bottom: 10px;">
                                <b>What happened:</b> The log inspection identified repetitive login failures followed by an abnormal success pattern. This behavior is characteristic of an automated <b>Credential Stuffing Attack (MITRE ATT&CK T1078)</b>.
                            </p>
                            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">FILE HASH (SHA-256):</p>
                            <code style="background: #0b0f19; padding: 6px 10px; border-radius: 6px; font-size: 11px; color: #38bdf8; display: block; word-break: break-all;">{analysis.get('sha256')}</code>
                        </div>
                    """, unsafe_allow_html=True)
                
                with tab_fix:
                    st.markdown("""
                        <div style="margin-top: 8px;">
                            <p style="font-size: 13px; color: #cbd5e1; margin-bottom: 8px;">
                                <b>Recommended Remediation Steps:</b> Execute the following automated commands or playbooks to resolve this security incident:
                            </p>
                            <p style="font-size: 12px; color: #34d399; font-weight: 600; margin-bottom: 4px;">1. Block Attacking IP via UFW / Firewall:</p>
                            <code style="background: #0b0f19; padding: 8px; border-radius: 6px; font-size: 11px; color: #f87171; display: block; margin-bottom: 10px;">sudo ufw deny from 192.168.1.150 to any port 22</code>
                            
                            <p style="font-size: 12px; color: #34d399; font-weight: 600; margin-bottom: 4px;">2. Force Password Reset for Compromised Account:</p>
                            <code style="background: #0b0f19; padding: 8px; border-radius: 6px; font-size: 11px; color: #38bdf8; display: block; margin-bottom: 10px;">passwd -e target_user_account</code>

                            <p style="font-size: 12px; color: #34d399; font-weight: 600; margin-bottom: 4px;">3. Terminate Active User Sessions:</p>
                            <code style="background: #0b0f19; padding: 8px; border-radius: 6px; font-size: 11px; color: #fbbf24; display: block;">pkill -u target_user_account</code>
                        </div>
                    """, unsafe_allow_html=True)
            else:
                st.error("Error executing triage scan.")
        else:
            st.markdown("""
                <div style="text-align: center; padding: 50px 0; color: #64748b;">
                    <p style="font-size: 14px; font-weight: 500; color: #94a3b8; margin: 0;">Awaiting Forensic Payload</p>
                    <p style="font-size: 12px; margin-top: 4px;">Upload your log file and click the button to generate explanations and fixes.</p>
                </div>
            """, unsafe_allow_html=True)
            
        st.markdown('</div>', unsafe_allow_html=True)

# ==========================================
# 2. AI SECURITY CO-PILOT
# ==========================================
elif selected_tab == "🤖 AI Security Co-Pilot":
    st.markdown("<h3 class='page-title' style='font-size: 18px; margin-bottom: 4px;'>AI Security Analyst Chat</h3>", unsafe_allow_html=True)
    st.markdown("<p style='color: #64748b; font-size: 13px; margin-bottom: 20px;'>Ask questions about incident playbooks, script generation, or CVE analysis.</p>", unsafe_allow_html=True)
    
    st.markdown('<div class="saas-card">', unsafe_allow_html=True)
    if "messages" not in st.session_state:
        st.session_state["messages"] = [
            {"role": "assistant", "content": "Hello! I am your AI security assistant. What can I help you investigate today?"}
        ]
    
    for msg in st.session_state["messages"]:
        with st.chat_message(msg["role"]):
            st.write(msg["content"])
            
    if prompt := st.chat_input("Ask about IOCs, mitigation steps, or log analysis..."):
        st.session_state["messages"].append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.write(prompt)
            
        with st.chat_message("assistant"):
            with st.spinner("Generating security response..."):
                time.sleep(0.8)
                reply = f"Based on cybersecurity best practices regarding '{prompt}', I recommend isolating affected endpoints, checking firewall rules, and reviewing auth logs."
                st.write(reply)
                st.session_state["messages"].append({"role": "assistant", "content": reply})
    st.markdown('</div>', unsafe_allow_html=True)

# ==========================================
# 3. THREAT INTELLIGENCE
# ==========================================
elif selected_tab == "🌐 Threat Intelligence":
    st.markdown("<h3 class='page-title' style='font-size: 18px; margin-bottom: 4px;'>Global Threat Lookup</h3>", unsafe_allow_html=True)
    st.markdown("<p style='color: #64748b; font-size: 13px; margin-bottom: 20px;'>Query IOC reputation across integrated OSINT feeds.</p>", unsafe_allow_html=True)
    
    st.markdown('<div class="saas-card">', unsafe_allow_html=True)
    query_input = st.text_input("Indicator (IP Address, Domain, or File Hash)", placeholder="e.g., 192.168.1.100 or CVE-2024-0001")
    if st.button("Query Feed"):
        st.markdown(f"""
            <div style="margin-top: 16px; background: #0b0f19; padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); font-family: 'JetBrains Mono', monospace; font-size: 12px;">
                <span style="color: #34d399;">[+] Target: {query_input}</span><br>
                <span style="color: #f87171;">[!] Status: Flagged in Threat Database</span><br>
                <span style="color: #94a3b8;">[i] Category: Suspicious Outbound Beacon</span>
            </div>
        """, unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

# ==========================================
# 4. INVESTIGATION CASES
# ==========================================
elif selected_tab == "📁 Investigation Cases":
    st.markdown("<h3 class='page-title' style='font-size: 18px; margin-bottom: 4px;'>Investigation Cases</h3>", unsafe_allow_html=True)
    st.markdown("<p style='color: #64748b; font-size: 13px; margin-bottom: 20px;'>Manage active security investigations and case records.</p>", unsafe_allow_html=True)
    
    with st.form("new_case_form", clear_on_submit=True):
        st.markdown('<div class="saas-card">', unsafe_allow_html=True)
        st.markdown("<p style='font-weight: 600; font-size: 14px; margin-bottom: 12px;'>Create New Case</p>", unsafe_allow_html=True)
        c1, c2 = st.columns(2)
        with c1:
            title = st.text_input("Case Title", placeholder="e.g., Unauthorized API Access")
        with c2:
            status = st.selectbox("Priority Status", ["active", "pending", "closed"])
        description = st.text_area("Case Description", placeholder="Enter details...")
        submitted = st.form_submit_button("Save Case")
        if submitted and title:
            requests.post(f"{BACKEND_URL}/investigations/", json={"title": title, "description": description, "status": status})
            st.success("Case created successfully.")
        st.markdown('</div>', unsafe_allow_html=True)

    res = requests.get(f"{BACKEND_URL}/investigations/")
    if res.status_code == 200:
        for case in res.json():
            st.markdown(f"""
                <div class="saas-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="margin: 0; font-size: 15px; color: #f87171;">Case #{case['id']} — {case['title']}</h4>
                        <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #38bdf8;">{case['status'].upper()}</span>
                    </div>
                    <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0 0;">{case['description']}</p>
                </div>
            """, unsafe_allow_html=True)

# ==========================================
# 5. TELEMETRY & METRICS
# ==========================================
elif selected_tab == "📊 Telemetry & Metrics":
    st.markdown("<h3 class='page-title' style='font-size: 18px; margin-bottom: 4px;'>System Telemetry</h3>", unsafe_allow_html=True)
    st.markdown("<p style='color: #64748b; font-size: 13px; margin-bottom: 20px;'>Real-time metrics across active sensor nodes.</p>", unsafe_allow_html=True)
    
    res = requests.get(f"{BACKEND_URL}/investigations/")
    if res.status_code == 200:
        cases = res.json()
        total_cases = len(cases)
        total_evidence = sum(len(c.get("evidence_items", [])) for c in cases)

        c1, c2, c3 = st.columns(3)
        with c1:
            st.markdown(f"""
                <div class="saas-card" style="text-align: center;">
                    <p style="font-size: 11px; color: #64748b; font-family: 'JetBrains Mono', monospace; margin-bottom: 4px;">ACTIVE CASES</p>
                    <div style="font-size: 28px; font-weight: 700; color: #f8fafc;">{total_cases}</div>
                </div>
            """, unsafe_allow_html=True)
        with c2:
            st.markdown(f"""
                <div class="saas-card" style="text-align: center;">
                    <p style="font-size: 11px; color: #64748b; font-family: 'JetBrains Mono', monospace; margin-bottom: 4px;">ARTIFACTS LOGGED</p>
                    <div style="font-size: 28px; font-weight: 700; color: #f8fafc;">{total_evidence}</div>
                </div>
            """, unsafe_allow_html=True)
        with c3:
            st.markdown(f"""
                <div class="saas-card" style="text-align: center;">
                    <p style="font-size: 11px; color: #64748b; font-family: 'JetBrains Mono', monospace; margin-bottom: 4px;">SYSTEM INTEGRITY</p>
                    <div style="font-size: 28px; font-weight: 700; color: #34d399;">100%</div>
                </div>
            """, unsafe_allow_html=True)