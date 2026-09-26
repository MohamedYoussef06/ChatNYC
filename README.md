# nyc-companion

A monorepo for an NYC trip companion: a Next.js app, a FastAPI backend, and an iMessage bridge. CityPilot includes a Google map and location suggestions. Trip times remain illustrative; other provider integrations stay behind service stubs until API keys and clients are wired in.

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

## Google Maps and location suggestions

Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key` to `frontend/.env.local`, then restart the frontend. In the key's Google Cloud project, enable **Maps JavaScript API** and **Places API (New)** with billing enabled. Allow both APIs in the key's API restrictions and allow your localhost and production websites in its website restrictions. See [Google's Places setup guide](https://developers.google.com/maps/documentation/javascript/place-get-started).

CityPilot's From and To fields search after three characters and a 350 ms pause. They show at most five real Google results, prioritize NYC, and sort each city/outside-city group by straight-line distance from the selected starting point (initially Columbia University). If the starting text is edited without selecting a suggestion, Midtown Manhattan is used and labeled as the fallback. Results depend on Google's coverage and matching; they are not an exhaustive listing of businesses.

Autocomplete handles partial addresses and names, and Text Search adds nearby category/chain matches. Only visible autocomplete results request address previews; selecting a prediction requests its address and coordinates and ends its autocomplete session. These use billable Places requests. No location permission is requested. Use the arrow keys and Enter or click a suggestion; Escape closes the list. Manual entry remains available if Places is unavailable.
