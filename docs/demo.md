# Demo

Start the API, the site, and the messaging bridge in three terminals. Copy the example env files only if you need to override localhost.

```bash
cd backend
cp .env.example .env.local
# Optional: paste GROK_API_KEY=… and MAPS_API_KEY=…
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

```bash
cd messaging
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Home links to the four sections.
2. Discover shows Prospect Park from `GET /api/discover`.
3. Navigate shows walking / driving / transit options for Atlantic Av-Barclays Ctr → Prospect Park. With `GROK_API_KEY` in `backend/.env.local`, Grok highlights a recommended mode.
4. Assistant connects to `ws://localhost:8000/ws`. Send the draft message and read the CityPilot reply.
5. Profile shows Alex Rivera in Prospect Heights from `GET /api/users/me`.

The messaging process prints `backend ok`, `imessage bridge ready`, and the assistant reply. It exits after that sample call.

`database/schema.sql` and `database/seed.sql` are not applied automatically. Load them into Tiger Data or Postgres when you want persisted rows. The running demo does not read those tables.
