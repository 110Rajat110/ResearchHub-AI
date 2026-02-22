# Deployment Guide — ResearchHub AI

This guide explains how to deploy the ResearchHub AI application to a production environment using Docker.

---

## 1. Production Configuration

### Backend (`backend/.env`)
Ensure your production environment variables are set:
- `GROQ_API_KEY`: Your live Groq API key.
- `SECRET_KEY`: A strong, random 32-character hex string.
- `DATABASE_URL`: In production, you might want to switch to PostgreSQL, but SQLite will continue to work.

### Frontend (`frontend/.env.production`)
Create a file named `.env.production` in the `frontend` folder to point to your live backend domain:
```env
VITE_API_URL=https://api.yourdomain.com
```

---

## 2. Deploying with Docker (Recommended)

The project includes `Dockerfile`s for both frontend and backend, and a `docker-compose.yml` to run them together.

### Commands:
```bash
# 1. Build and start services in detached mode
docker-compose up -d --build

# 2. Check logs
docker-compose logs -f
```

### What's happening?
- **Backend**: Runs on port 8000 using Uvicorn.
- **Frontend**: Built and served via **Nginx** on port 80.
- **Reverse Proxy**: Nginx is configured (inside the Dockerfile) to proxy `/api/` requests to the backend container automatically.

---

## 3. Alternative Platform Hosting

### Frontend (Static Sites)
You can deploy the frontend to **Vercel**, **Netlify**, or **Cloudflare Pages**:
1. Build locally: `cd frontend && npm run build`
2. Upload the `dist` folder.
3. Set the `VITE_API_URL` environment variable in the platform dashboard.

### Backend (PaaS)
You can deploy the backend to **Render**, **Railway**, or **Fly.io**:
1. Point to the `backend` subdirectory.
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
4. Set your `.env` variables in the platform dashboard.

---

## 4. Post-Deployment Checklist
- [ ] Verify CORS settings in `backend/app/main.py` include your production domain.
- [ ] Ensure `SECRET_KEY` is not the default value.
- [ ] Check that `researchhub.db` (if using SQLite) is persisted in a Docker volume.
