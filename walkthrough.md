# ResearchHub AI — Project Walkthrough

Welcome to your new agentic research management system! Here's a tour of how the system works and how it's built.

---

## 1. Project Organization
The project is split into two main directories:
- `/backend`: A FastAPI powered REST API.
- `/frontend`: A modern React + TypeScript single-page application.

---

## 2. Key Components

### 🏠 Dashboard (`/frontend/src/pages/Dashboard.tsx`)
The nerve center where you manage your research projects (Workspaces). Each workspace acts as a container for papers and chat history.

### 🔍 Paper Search (`/frontend/src/pages/Search.tsx`)
Integrates with the **OpenAlex API** to search across 250M+ scientific papers. You can "one-click" import papers directly into a workspace.

### 🤖 AI Chatbot (`/backend/app/routers/chat_router.py`)
This is where the magic happens. When you ask a question:
1. The system retrieves your imported papers.
2. It uses **sentence-transformers** locally to find the most relevant paper chunks.
3. It sends the query + relevant context to **Groq's Llama 3.3 70B** model.
4. You get a scholarly, context-aware response based on *your* documents.

---

## 3. Security & Data
- **Auth**: Fully implemented with JWT (JSON Web Tokens) and bcrypt password hashing.
- **Database**: Uses SQLite for easy setup, with a clear SQLAlchemy schema in `backend/app/models.py`.

---

## 4. Design Aesthetics
The UI uses a custom **Glassmorphism** design system with:
- Deep dark mode with subtle indigo/violet gradients.
- Responsive layouts for desktop and mobile.
- Staggered animations using Tailwind's keyframes.

---

## 5. Next Steps for You
1. **API Key**: Ensure your Groq API key is in `backend/.env`.
2. **Exploration**: Create a workspace like "Agentic AI", search for some papers, import them, and try asking: *"Compare the findings across these papers."*
