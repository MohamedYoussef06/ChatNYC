# DivHacks---Unnamed-Project-MTA-THINGY-

Solo NYC subway trip planner. The FastAPI service in `backend/` plans one rider's trip from MTA schedule and GTFS-Realtime data, then stores a read-only meeting snapshot that someone else can open with a share code.

No accounts, live location, or multi-user ETA board in this pass. Subway only.

## Setup

From the repo root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

On macOS or Linux, activate with `source .venv/bin/activate` and copy the env file with `cp .env.example .env`.

The API listens on [http://localhost:8000](http://localhost:8000). Interactive docs are at [http://localhost:8000/docs](http://localhost:8000/docs).

Startup downloads subway GTFS into `backend/data/` (refreshed if the zip is older than 24 hours) and creates `backend/data/trips.db`. The feed poller starts with the app and refreshes every 30 seconds.

## Environment

Copy `backend/.env.example` to `backend/.env`.

| Variable | Purpose |
| --- | --- |
| `MTA_API_KEY` | Key from [api.mta.info](https://api.mta.info). Leave blank to plan from the static schedule only. Responses then set `live` to `false`. |
| `MTA_FEED_BASE` | GTFS-Realtime base URL. The service polls `nyct/gtfs`, `nyct/gtfs-ace`, `nyct/gtfs-bdfm`, `nyct/gtfs-g`, `nyct/gtfs-jz`, `nyct/gtfs-nqrw`, `nyct/gtfs-l`, `nyct/gtfs-si`, and `camsys/all-alerts`. |
| `GTFS_STATIC_URL` | Subway `google_transit.zip`. |
| `POLL_INTERVAL_SECONDS` | Live feed poll interval. Default `30`. |
| `DATABASE_URL` | SQLite URL. Default `sqlite:///./data/trips.db`. |
| `GEOSEARCH_URL` | NYC Planning Labs GeoSearch. |
| `TRANSFER_PENALTY_SECONDS` | Walk penalty for a platform change. Default `120`. |
| `WALK_SPEED_MPS` | Straight-line walk speed for the legs before and after the subway. Default `1.3`. |
| `MAX_SNAP_METERS` | Reject a point when the nearest subway station is farther than this. Default `3000`. |

The app creates the SQLite tables from `backend/app/models.py` on startup.

## Endpoints

### `GET /health`

Process health, whether static GTFS loaded, and whether the live cache is fresh.

### `GET /api/stations?q=`

Typeahead over parent subway station names.

```json
[{ "id": "127", "name": "Times Sq-42 St", "lat": 40.75529, "lon": -73.987495 }]
```

### `POST /api/trips`

Geocode or accept coordinates, snap each point to the nearest subway station, route with Dijkstra, then overlay the next live train when `MTA_API_KEY` is set.

```json
{
  "origin": { "label": "Times Square", "lat": 40.75529, "lon": -73.987495 },
  "destination": { "query": "Union Square, Manhattan" }
}
```

```json
{
  "id": "trip id",
  "origin": {
    "label": "Times Square",
    "lat": 40.75529,
    "lon": -73.987495,
    "station": { "id": "127", "name": "Times Sq-42 St", "lat": 40.75529, "lon": -73.987495 }
  },
  "destination": { "label": "Union Square", "lat": 40.735736, "lon": -73.990568, "station": {} },
  "legs": [
    {
      "type": "walk",
      "route": null,
      "from": { "label": "Times Square", "lat": 40.75529, "lon": -73.987495 },
      "to": { "label": "Times Sq-42 St", "lat": 40.75529, "lon": -73.987495 },
      "departure": "2026-09-26T12:40:00-04:00",
      "arrival": "2026-09-26T12:42:00-04:00",
      "live": false
    },
    {
      "type": "subway",
      "route": "N",
      "from": { "label": "Times Sq-42 St", "lat": 40.75529, "lon": -73.987495 },
      "to": { "label": "14 St-Union Sq", "lat": 40.735736, "lon": -73.990568 },
      "departure": "2026-09-26T12:46:00-04:00",
      "arrival": "2026-09-26T12:54:00-04:00",
      "live": true
    }
  ],
  "alerts": [{ "header": "Delays on the N", "routes": ["N"] }],
  "duration_seconds": 900,
  "live": true
}
```

`legs[].type` is `walk`, `subway`, or `transfer`. Points outside the subway stop set are rejected. `GET /api/trips/{id}` returns the stored plan.

### `POST /api/meetings` and `GET /api/meetings/{share_code}`

Freeze one planned trip plus a meetup place. Opening the share code does not join a live session.

```json
{ "trip_id": "trip id", "place_name": "Union Square", "arrive_by": "2026-09-26T18:00:00-04:00" }
```

```json
{ "share_code": "a1b2c3d4", "url_path": "/api/meetings/a1b2c3d4" }
```

`GET /api/meetings/{share_code}` returns the saved place, itinerary, and alerts from save time.
