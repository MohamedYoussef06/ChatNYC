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

Startup downloads subway GTFS into `backend/data/` (refreshed if the zip is older than 24 hours) and creates `backend/data/trips.db`. If the download fails it uses the copy committed in `backend/data/google_transit/`. The feed poller starts with the app and refreshes every 30 seconds, and the GTFS reloads on its own when the date rolls over.

## Environment

Copy `backend/.env.example` to `backend/.env`.

| Variable | Purpose |
| --- | --- |
| `MTA_API_KEY` | Optional key from [api.mta.info](https://api.mta.info). The subway feeds are public, so live trains work without it. When set it's sent as `x-api-key`. |
| `MTA_FEED_BASE` | GTFS-Realtime base URL. The service polls `nyct/gtfs`, `nyct/gtfs-ace`, `nyct/gtfs-bdfm`, `nyct/gtfs-g`, `nyct/gtfs-jz`, `nyct/gtfs-nqrw`, `nyct/gtfs-l`, `nyct/gtfs-si`, and `camsys/all-alerts`. |
| `GTFS_STATIC_URL` | Subway `google_transit.zip`. |
| `POLL_INTERVAL_SECONDS` | Live feed poll interval. Default `30`. |
| `DATABASE_URL` | SQLite URL. Default `sqlite:///./data/trips.db`. |
| `GEOSEARCH_URL` | NYC Planning Labs GeoSearch. |
| `TRANSFER_PENALTY_SECONDS` | Walk penalty for a platform change. Default `120`. |
| `WALK_SPEED_MPS` | Straight-line walk speed for the legs before and after the subway. Default `1.3`. |
| `MAX_SNAP_METERS` | Reject a point when the nearest subway station is farther than this. Default `3000`. |
| `SNAP_CANDIDATES` / `SNAP_RADIUS_METERS` | How many nearby stations to try at each end, and how far to look. Defaults `5` and `1000`. |
| `TRANSFER_WEIGHT_SECONDS` | How much faster a trip with an extra transfer has to be before it wins. Default `240`. |
| `SEARCH_HOURS` | How far ahead to look for trains. Default `3`. |
| `ARRIVE_BUFFER_MINUTES` | Safety buffer for `arrive_by` plans. Default `5`. |
| `NOMINATIM_URL` | OpenStreetMap search, used for venues GeoSearch doesn't know (like "Smalls Jazz Club"). Blank turns it off. |
| `SHARE_URL_BASE` | Base for `share_url` on meetings. Default `http://localhost:3000/meet`. |

The app creates the SQLite tables from `backend/app/models.py` on startup.

## Endpoints

### `GET /health`

Process health, whether static GTFS loaded, whether the live cache is fresh, how many scheduled trips are loaded (`timetable_trips`) and how many trains the live feed is tracking (`live_trains`).

### `GET /api/stations?q=`

Typeahead over parent subway station names.

```json
[{ "id": "127", "name": "Times Sq-42 St", "lat": 40.75529, "lon": -73.987495, "routes": ["1", "2", "3"] }]
```

### `GET /api/places?q=`

Typeahead for the From and To boxes. Matching stations come first (`type: "station"` with `routes`), then NYC addresses (`type: "address"`).

### `POST /api/trips`

Accept coordinates or text. Text is matched against station names first ("Barclays Center", "Columbia University"), then NYC GeoSearch, then OpenStreetMap for venues.

Routing searches real train times: scheduled trips for the service day, with live trains replacing the scheduled ones wherever the feed covers them. It tries the 5 closest stations at each end, skips lines that aren't running, counts waits and transfers, and prefers fewer transfers unless the extra one saves more than `TRANSFER_WEIGHT_SECONDS`. If walking is quicker, the plan is a single walk. When no timetable is loaded (tests, broken GTFS) it falls back to the station graph and Dijkstra.

Add `arrive_by` to plan backwards from a deadline. The plan leaves as late as possible while still arriving `buffer_minutes` early (default `ARRIVE_BUFFER_MINUTES`). `depart_at` then means the earliest you can leave.

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

New fields for the CityPilot screens. Nothing above changed:

| Field | Meaning |
| --- | --- |
| `leave_at`, `arrive_at` | Latest time to leave and still make the first train, and the arrival time. |
| `arrive_by`, `buffer_seconds`, `on_time`, `slack_seconds` | Only when `arrive_by` was sent. |
| `breakdown` | `walk_seconds`, `ride_seconds`, `transfer_seconds`, `wait_seconds`. |
| `transfers`, `routes`, `title`, `summary` | Like `"Take the 1 to 96 St, then the 2 to Wall St"`. |
| `legs[].duration_seconds` | Every leg. |
| `legs[].headsign`, `direction`, `stops`, `wait_seconds`, `color` | Subway legs, like `"South Ferry"`, `"southbound"`, 16 stops, MTA line color. |

### `GET /api/trips`

Recent plans, newest first, in the frontend `Trip` card shape: `id`, `title`, `origin`, `destination`, `summary`, plus `leave_at`, `arrive_at`, `duration_seconds`, `live`, `created_at`. `?limit=` defaults to 20.

### `POST /api/meetings` and `GET /api/meetings/{share_code}`

Freeze one planned trip plus a meetup place. Opening the share code does not join a live session.

```json
{ "trip_id": "trip id", "place_name": "Union Square", "arrive_by": "2026-09-26T18:00:00-04:00" }
```

```json
{ "share_code": "a1b2c3d4", "url_path": "/api/meetings/a1b2c3d4", "share_url": "http://localhost:3000/meet/a1b2c3d4" }
```

`GET /api/meetings/{share_code}` returns the saved place, itinerary, and alerts from save time (pulled fresh from the live feed when the meeting is saved).
