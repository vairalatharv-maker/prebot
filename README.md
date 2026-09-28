# PrepBot – AI Placement Coach

Phase 1 foundation for a placement preparation platform. The frontend runs on Vite and the API runs on Express. Authentication is backed by MongoDB when configured; no credentials are committed.

## Setup

1. Install Node.js 20+ and MongoDB (local or hosted).
2. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`, a long random `JWT_SECRET`, and your `GROQ_API_KEY`. The Groq key is used only by the backend. `GROQ_MODEL` is optional and defaults to `llama-3.3-70b-versatile`.
3. From the project root run `npm install`, `npm --prefix frontend install`, and `npm --prefix backend install`.
4. Run `npm run dev`. Open the frontend at http://localhost:5173 (or http://127.0.0.1:5173); local API requests use the Vite proxy. API health: http://localhost:4000/api/health.

Without MongoDB credentials the UI still runs, but registration/login will return a clear API error. Without a Groq key, `/api/chat` returns a clear configuration error. Chat history stays in the current browser tab's session storage and is sent to the backend for each response; the backend limits history length and does not store chat transcripts. Authentication only stores the signed session returned by the API; no demo account is created.
