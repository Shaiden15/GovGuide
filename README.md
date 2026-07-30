# GovGuide
GovGuide SA is an AI-powered platform that simplifies South African government services for citizens. The platform guides users through complex application processes, checks documents before submission, supports multiple African languages, and explains rejection letters in plain language.

## Project structure

- `govguide-frontend/` — React 19 + Vite + Tailwind CSS frontend
- `govguide-backend/` — Node.js + Express API (Supabase, Claude API, Google Vision OCR)

## Getting started

### One-time setup

```
cp govguide-backend/.env.example govguide-backend/.env    # fill in Supabase / Anthropic / Google Vision credentials
cp govguide-frontend/.env.example govguide-frontend/.env
npm install               # installs root dev tooling (concurrently)
npm run install:all       # installs backend + frontend dependencies
```

### Run both apps together

```
npm run dev
```

This runs the backend (http://localhost:8000) and frontend (http://localhost:5173) concurrently from the root folder.

### Run individually

```
cd govguide-backend && npm run dev    # http://localhost:8000
cd govguide-frontend && npm run dev   # http://localhost:5173
```

The frontend dev server proxies `/api/*` requests to the backend (configured in `govguide-frontend/vite.config.js`). Visiting `http://localhost:5173` shows a "Backend: online" status once both servers are running.
