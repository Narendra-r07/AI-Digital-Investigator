# Deployment Guide - AI Digital Investigator

This guide provides instructions for deploying the **AI Digital Investigator** platform in production using Docker, Cloud Managed Services (Render / Railway / Vercel), or self-hosted servers.

---

## 1. Prerequisites

- **OpenAI API Key**: Obtain a key from [OpenAI Platform](https://platform.openai.com/).
- **Docker & Docker Compose**: Required for containerized deployments.
- **Node.js 20+ & Python 3.11+**: Required for local server setups.

---

## 2. Docker Compose Deployment (Recommended for On-Prem / Cloud VM)

Deploy both backend (FastAPI) and frontend (Nginx + React) using Docker Compose:

### Step A: Configure Environment
Create a `.env` file in the project root directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

### Step B: Build and Start Containers
Run the following command in the project root:
```bash
docker-compose up --build -d
```

### Step C: Access Application
- **Frontend App**: `http://localhost`
- **Backend API Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

To stop containers:
```bash
docker-compose down
```

---

## 3. Cloud Deployment (Render + Vercel / Netlify)

### A. Deploy Backend on Render / Railway
1. Connect your repository to **Render** or **Railway**.
2. Create a new **Web Service**.
3. Set Build Command: `pip install -r backend/requirements.txt`
4. Set Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port 8000`
5. Add Environment Variables:
   - `OPENAI_API_KEY`: Your key
   - `OPENAI_MODEL`: `gpt-4o-mini`

### B. Deploy Frontend on Vercel / Netlify
1. Connect `frontend/` directory to **Vercel** or **Netlify**.
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`
4. Set Environment Variable:
   - `VITE_API_BASE`: `https://your-backend-render-url.onrender.com`

5. On the backend, set `CORS_ORIGINS` to your deployed frontend URL (for
   example, `https://your-app.vercel.app`). Separate multiple URLs with commas.

---

## 4. Environment Variables Reference

| Variable Name | Description | Default |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | OpenAI API Secret Key | Required for GPT reasoning |
| `OPENAI_MODEL` | Target OpenAI Model | `gpt-4o-mini` |
| `VITE_API_BASE` | Public backend URL used by the frontend | `http://127.0.0.1:8000` |
| `CORS_ORIGINS` | Comma-separated frontend URLs allowed by the API | Local Vite URLs |
| `STORAGE_DIR` | Directory for evidence files | `storage/evidence` |
| `CHROMA_PATH` | Directory for ChromaDB vector store | `storage/chroma` |

---

## 5. Security & Production Checklist

- [x] Enable SSL / HTTPS using Let's Encrypt or Cloudflare.
- [x] Restrict CORS origins in `backend/main.py` to production domain.
- [x] Secure storage directory permissions for forensic evidence files.
