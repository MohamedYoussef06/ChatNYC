# ChatNYC

## Inspiration

A night in New York is three jobs at once: somewhere to go, a train that is actually running, and a plan you can hold onto. You still have to notice that the 2 is delayed, that an extra transfer saves four minutes and costs ten, and that you should have left already.

We wanted one companion for that. Ask "cheap date tonight" or "I have 3 hours in Brooklyn" and get places or a timed itinerary, a leave-by time, and a way to send the plan to someone else. The companion is **Ock**. The ride is **NextStop**. Together they are ChatNYC.

We started smaller than the pitch. One rider, subway only, no accounts. Train times had to be right before Ock could be trusted with the rest of the day.

## What it does

- **Ock** takes a plain-language ask and returns place cards or a timed itinerary, with nearby subway lines. Chips such as "Make it cheaper" and "Less walking" change the current plan. "Get me there" opens NextStop on that stop.
- **NextStop** compares transit, driving, and walking for an arrive-by time: duration, walking minutes, transfers, cost, and whether you can still make it. Grok picks a mode and names the tradeoffs. The route is drawn on a map.
- **The subway planner** builds the trip from the MTA's scheduled GTFS and live GTFS-Realtime feeds. It skips lines that are not running, counts waits and transfers, and keeps fewer transfers unless the extra one saves real time. Arrive-by plans leave as late as they can and still arrive with a safety buffer. The plan reads like "Take the 1 to 96 St, then the 2 to Wall St."
- **Place search** matches station names first, then NYC GeoSearch, then OpenStreetMap, so "Barclays Center" and "Smalls Jazz Club" both resolve.
- **Sharing.** A planned trip can be saved and texted as an iMessage through Photon Spectrum. A meeting snapshot can also be frozen behind a share code.

Home, Discover, and a guest-or-account welcome sit around those pieces. Guests use the app with nothing stored. An account is how Ock is meant to keep conversations and preferences.

## How we built it

Three processes.

- **Site** (`frontend/`). Next.js 15, React 19, and Tailwind CSS, in subway blue. Google Maps in the browser handles autocomplete, directions, and the map. The only backend call on NextStop is `POST /api/trips/recommend`, which sends the compared routes to Grok.
- **API** (`backend/`). FastAPI and Uvicorn, SQLAlchemy, Pydantic. A poller refreshes the live feeds every 30 seconds. Trips, meetings, profiles, and preferences live in SQLite by default, or Postgres on Tiger Cloud.
- **Messages** (`messaging/`). A small Node and TypeScript service on Photon Spectrum. The backend asks it to send the itinerary.

xAI Grok writes the route recommendation. Backboard and ElevenLabs are in the backend for memory and voice, which are the next layer on top of the planner.

## Challenges we ran into

The site and the planner were built on branches that had already diverged. The backend used single files for models, schemas, and the database. The frontend branch expected those as packages. Line endings had also flipped across the whole tree, so every file looked edited. We normalized to LF and moved the backend into packages before the merge could be reviewed.

After the merge, the two halves still barely talked. NextStop took transit from Google in the browser. The live planner — hundreds of stations, tens of thousands of scheduled trips, and the trains the feed was tracking — had no page calling it. Meeting links pointed at `/meet`, and that page was not in the app. Ock's workspace ran on a local mock. Profile called `GET /api/users/me`, and that route was not mounted. Several older routers crashed on import because the schemas they expected had moved.

The map failed for a boring reason that took a while to see: the Google key lived in `backend/.env`, and the map reads `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` from the frontend env. Grok failures were harder. The recommend route caught every error and raised a 502 with the original exception thrown away, so a wrong model name looked like a generic outage.

Photon had its own order of operations. The iMessage agent could only start after the project, plan, and line were configured. Guests and most local setups have no hosted database, and a missing connection cannot take the API down with it.

## Accomplishments that we're proud of

The planner answers with real trains. It loads the subway timetable, polls live positions and alerts, and plans a trip such as Times Square to Barclays on the N, with leave time, a walk / ride / wait / transfer breakdown, and line colors the NextStop screens were already drawn to show.

Place text survives the messy cases. Station names win when they should, NYC addresses fill in the rest, and venues GeoSearch has never heard of fall through to OpenStreetMap.

Ock and NextStop exist as a product, not a diagram: an MTA-inspired UI, arrive-by comparison across three modes, a Grok recommendation with explicit tradeoffs, and a saved itinerary that actually goes out as an iMessage.

The app still boots on SQLite when Tiger Cloud is absent.

## What we learned

The shape of the trip is the product. Leave time, the time breakdown, and one plain-English sentence are what the screens needed, so the planner's response became the contract between the two teams.

A key in the wrong env file is the same as no key. A swallowed exception is worse than a crash, because the demo fails and the cause is gone. We now let the original error through on the Grok path.

Split the work by what the data describes. Transit state belongs with the timetable. Guests have to keep working when a hosted database is missing.

And merge early. Two branches that each look finished still leave you with a UI on mock data and an engine with no caller.

## What's next for ChatNYC

- Point NextStop's transit option at `POST /api/trips`, so the live MTA plan is the ride, with Google kept for driving and walking.
- Replace Ock's mock with `POST /api/assistant/chat` that returns the same place cards and itineraries, and store those conversations for signed-in users through Backboard.
- Mount accounts for real, back the profile and "Ock knows", and add the `/meet` page the share codes already point at.
- Fill Discover from real places, and connect the weather lookup that currently always comes back empty.
- Turn on voice with ElevenLabs, and an active-trip view that follows live trains and alerts after you leave.

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
| `DATABASE_URL` | SQLite or Postgres URL. Default `sqlite:///./data/trips.db`. Paste the Tiger Cloud service URL (`postgres://...?sslmode=require`) to use the hosted database. |
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

The app creates the tables from `backend/app/models.py` on startup, in SQLite or Tiger Cloud depending on `DATABASE_URL`.

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
