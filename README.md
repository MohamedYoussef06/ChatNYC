# nyc-companion

A monorepo for an NYC trip companion: a Next.js app, a FastAPI backend, and an iMessage bridge. Navigate compares walking, driving, and transit; Grok can highlight a recommended mode when `GROK_API_KEY` is set. Other providers (Backboard, ElevenLabs, NYC Open Data) still use stubs until their clients are wired.

## Layout

```text
nyc-companion/
├── frontend/              # Next.js App Router UI
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI application and router registration
│   │   ├── api/           # HTTP endpoints and WebSocket handlers
│   │   ├── core/          # CityPilot, recommendations, personalization
│   │   ├── services/      # External provider integrations
│   │   ├── models/        # SQLAlchemy database models
│   │   ├── schemas/       # Pydantic request and response contracts
│   │   └── db/            # Database connection and repositories
│   └── tests/             # Backend tests
├── messaging/             # TypeScript iMessage bridge scaffold
├── database/              # PostgreSQL schema, seed data, migrations
├── docs/                  # Architecture, API, and demo notes
├── .gitignore
├── .env.example           # Pointers to each package's environment template
└── README.md
```

`nyc-companion` is the project name; the checkout folder can retain its existing name. The tree shows the main layout. Package configuration and dependency files stay with their packages, `backend/app/config.py` holds backend settings, and `.github/workflows/ci.yml` runs package checks.

See [docs/architecture.md](docs/architecture.md) for where to place new code and how the packages communicate.

## Run locally

Use three terminals. Copy each `.env.example` if you want to override the localhost defaults; the apps boot without those files.

```bash
cd backend
cp .env.example .env.local
# Paste GROK_API_KEY=… (and optionally MAPS_API_KEY=…) into .env.local
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

```bash
cd messaging
npm install
npm run dev
```

The site is at [http://localhost:3000](http://localhost:3000). The API is at [http://localhost:8000](http://localhost:8000). Messaging checks `GET /health`, then sends one sample line to `POST /api/assistant/chat`.

Per-package variables live in `frontend/.env.local.example`, `backend/.env.example` / `backend/.env.local`, and `messaging/.env.example`. Paste your xAI key into **`GROK_API_KEY`** in `backend/.env.local`. Optional `MAPS_API_KEY` enables live Google Directions for the three modes. See [docs/demo.md](docs/demo.md) for the click-through and [docs/api.md](docs/api.md) for routes.
