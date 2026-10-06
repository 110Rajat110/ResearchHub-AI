# ResearchHub AI

Intelligent Research Paper Management and Analysis System powered by Agentic AI.

## 🚀 Features
- **Smart Search**: Discover papers from academic databases (OpenAlex) with metadata and abstracts.
- **Workspaces**: Organize papers into multiple project-specific workspaces.
- **AI Chatbot**: Interact with a Groq-powered dynamic LLM model (e.g. openai/gpt-oss-120b) that understands your saved papers using RAG (Retrieval-Augmented Generation).
- **Security**: JWT-based authentication for secure research data management.

## 🛠️ Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- Groq API Key (Get it at [console.groq.com](https://console.groq.com))

### 1. Backend Setup
1. Navigate to the `backend` directory.
2. The virtual environment is already created if you followed the initial setup.
3. Activate the environment:
   ```bash
   .\venv\Scripts\activate
   ```
4. Open `.env` and paste your **GROQ_API_KEY**.
5. Start the server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### 2. Frontend Setup
1. Navigate to the `frontend` directory.
2. The dependencies are already installed.
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the app at [http://localhost:5173](http://localhost:5173).

## 🧠 Technical Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS.
- **Backend**: FastAPI, SQLAlchemy, SQLite, Pydantic.
- **AI/ML**: Groq (openai/gpt-oss-120b), Sentence-Transformers (Local Embeddings), ColPali (Visual Retrieval).
