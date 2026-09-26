# nyc-companion

A monorepo for an NYC trip companion: a Next.js app, a FastAPI backend, and an iMessage bridge. This scaffold boots locally with hello-world data. Live Grok, Backboard, ElevenLabs, maps, and NYC Open Data calls stay behind service stubs until API keys and clients are wired in.

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

Per-package variables live in `frontend/.env.local.example`, `backend/.env.example`, and `messaging/.env.example`. See [docs/demo.md](docs/demo.md) for the click-through and [docs/api.md](docs/api.md) for routes.
