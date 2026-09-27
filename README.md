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

Map panning/zooming and in-app location searches are restricted to a shared rectangle covering the five boroughs (`NYC_BOUNDS`). The rectangle includes some neighboring areas; it is not an exact NYC boundary polygon. The external Google Maps search fallback is a separate website and is not restricted by the app.

Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key` to `frontend/.env.local`, then restart the frontend. In the key's Google Cloud project, enable **Maps JavaScript API** and **Places API (New)** with billing enabled. Allow both APIs in the key's API restrictions and allow your localhost and production websites in its website restrictions. See [Google's Places setup guide](https://developers.google.com/maps/documentation/javascript/place-get-started).

CityPilot's From and To fields search after three characters and a 350 ms pause. They show at most five real Google results, prioritize NYC, and sort each city/outside-city group by straight-line distance from the selected starting point (initially Columbia University). If the starting text is edited without selecting a suggestion, Midtown Manhattan is used and labeled as the fallback. Results depend on Google's coverage and matching; they are not an exhaustive listing of businesses.

Autocomplete handles partial addresses and names, and Text Search adds nearby category/chain matches. Only visible autocomplete results request address previews; selecting a prediction requests its address and coordinates and ends its autocomplete session. These use billable Places requests. No location permission is requested. Use the arrow keys and Enter or click a suggestion; Escape closes the list. Manual entry remains available if Places is unavailable.

## Walking, driving, transit, and Grok recommendations

Enable **Routes API** in the same Google Cloud project and allow it in the browser key's API restrictions, alongside Maps JavaScript API and Places API (New). CityPilot's **Compare routes** button requests one Google route for each mode, draws the selected route, and sends only numeric route summaries and cost notes to the backend for a Grok recommendation. Driving makes a second request when needed to estimate traffic near the calculated departure time. Route endpoints must be within the NYC bounds; a route may pass outside them.

Put the private xAI key in `backend/.env` (never in a `NEXT_PUBLIC_` variable):

```env
GROK_API_KEY=your_xai_key
GROK_MODEL=grok-4.7
```

Run the FastAPI backend from the `backend` folder with `uvicorn app.main:app --reload --port 8000`; restart it after changing the key. The model can be overridden with any model on your account that supports structured JSON output. xAI account credits and model access are required. The frontend uses `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:8000`.

Google supplies travel times, transit schedules, transfers, walking segments, and fares when available. Driving cost is unknown unless you enter your own estimate for fuel, tolls, and parking. Missing values are never assumed to be free or zero. Reported transit waiting is the scheduled gap between connecting rides minus transfer walking, not initial waiting. Headway means time between vehicles, not actual wait. Departure/arrival times have no added buffer and are estimates, not guaranteed arrival times. Walking and driving leave-by times are calculated backwards; transit uses the returned schedule. Grok is instructed to weigh these limitations and the endpoint rejects recommendations for unavailable modes or late options when an on-time option exists.

If routing or Grok is unavailable, the UI explains the failure. Available routes remain selectable without AI; no AI recommendation is fabricated. Tests: `npm run test:routes` and `npm run typecheck` in `frontend`, and `python -m pytest` in `backend`.
