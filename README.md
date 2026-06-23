# GovGuide
GovGuide SA is an AI-powered platform that simplifies South African government services for citizens. The platform guides users through complex application processes, checks documents before submission, supports multiple African languages, and explains rejection letters in plain language.

## Project structure

- `govguide-frontend/` — React 19 + Vite + Tailwind CSS frontend
- `govguide-backend/` — Node.js + Express API (Supabase, Claude API, Google Vision OCR)

## Getting started

### Backend

```
cd govguide-backend
cp .env.example .env   # fill in Supabase / Anthropic / Google Vision credentials
npm install
npm run dev             # http://localhost:8000
```

### Frontend

```
cd govguide-frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

The frontend dev server proxies `/api/*` requests to the backend (configured in `govguide-frontend/vite.config.js`). Visiting `http://localhost:5173` shows a "Backend: online" status once both servers are running.
