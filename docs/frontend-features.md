# ChatNYC frontend: features and backend work

This is a walkthrough of every feature in `frontend/` on the `feature/frontend` branch (as of commit `c8f76e0`, "Add Grok route recommendations"), what data each one needs, and what the backend has to build so it stops running on mock data.

"Backend" here means the real service on the `Backend/Database` branch (MTA planner, Tiger Cloud, live feeds). The small FastAPI app that lives under `backend/` on `feature/frontend` is a hello-world placeholder, except for the Grok route recommendation endpoint described in section 5.

## Status legend

| Status | Meaning |
|---|---|
| **Live** | Works end to end with a real service. |
| **Browser-only** | Works, but the browser calls Google directly. No backend involved. |
| **Mock** | UI is finished, data is hard-coded in the frontend. |
| **Not wired** | Component exists but no page renders it, or the button does nothing yet. |

## At a glance

| # | Feature | Route | Status | Main backend need |
|---|---|---|---|---|
| 1 | Welcome, log in, sign up, guest | `/` | Mock | Auth endpoints and sessions |
| 2 | Home: Ask Ock search and classics | `/home` | Mock | Featured places |
| 2 | Home: "Ock thinks you'd like" | `/home` | Not wired | Personalized recommendations |
| 3 | Ock assistant workspace | `/assistant` | Mock | Chat endpoint that returns structured results |
| 4 | Ock memory panel ("Ock knows") | none | Not wired | Preferences and daily plans |
| 5 | NextStop: location search and route comparison | `/navigate` | Browser-only | Optional: MTA live transit option |
| 5 | NextStop: Grok recommendation | `/navigate` | Live on the placeholder backend only | Port `POST /api/trips/recommend` to `Backend/Database` |
| 6 | NextStop: leave-time card, breakdown, timeline, active trip | none | Not wired | Map the MTA planner's output into these components |
| 7 | Discover | `/discover` | Mock | Place search, saved places, map pins |
| 8 | Profile | `/profile` | Partly live (`GET /api/users/me`) | Users and preferences |
| 9 | Hello-world leftovers (WebSocket chat and others) | none | Not wired | Delete or replace |

## How the frontend talks to the backend today

- Base URL comes from `NEXT_PUBLIC_API_URL` and defaults to `http://localhost:8000` (`frontend/src/lib/api.ts`, `frontend/src/lib/route-options.ts`).
- WebSocket URL is `NEXT_PUBLIC_WS_URL` (`ws://localhost:8000/ws`), but nothing uses it yet.
- Google Maps runs in the browser with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. The key needs Maps JavaScript API, Places API (New), and Routes API enabled.
- Errors: when a request fails, the frontend reads `detail` from the JSON body (FastAPI's default) and shows it to the user when it's a string. Keep `detail` human-readable.

Calls the frontend actually makes right now:

| Call | Used by | Exists on `Backend/Database`? |
|---|---|---|
| `POST /api/trips/recommend` | NextStop, after comparing routes | **No.** Only on the placeholder backend. |
| `GET /api/users/me` | Profile page, signed-in users only | **No** |
| `GET /api/discover` | Defined in `api.ts`, no page calls it | No |
| `GET /api/trips` | Defined in `api.ts`, no page calls it | Yes, and the response shape is compatible |

---

## 1. Welcome, log in, sign up, guest (`/`)

**Files:** `app/page.tsx`, `components/auth/WelcomeAuth.tsx`, `components/auth/AuthProvider.tsx`

What's there:

- A welcome screen with **Log in**, **Create account** and **Continue as guest**.
- Log-in form: email and password. Sign-up form: name, email, password and password confirmation.
- Client-side validation only (email format, required fields, passwords match).
- `/?mode=login` and `/?mode=signup` open the matching form directly. Guest prompts link to `/?mode=signup`.
- "Signed-in" state is a React variable (`userMode: "authenticated" | "guest" | null`). It's lost on page refresh and nothing is sent to a server. The page says "Demo only, credentials aren't verified or stored."
- The copy promises that accounts let Ock "remember your conversations and preferences," while guest sessions aren't saved.

Backend needs:

- `POST /api/auth/signup` with `{ name, email, password }`
- `POST /api/auth/login` with `{ email, password }`
- `POST /api/auth/logout`
- A session mechanism (cookie or bearer token), password hashing, and a `users` table.
- Guest mode can stay entirely client-side, or use an anonymous session id if you want the chat to work across page loads.

Watch out: `Backend/Database` currently sets CORS to `allow_origins=["*"]` with `allow_credentials=False`. Cookie-based auth needs a specific origin (for example `http://localhost:3000`) and `allow_credentials=True`.

## 2. Home (`/home`)

**Files:** `app/home/page.tsx`, `components/home/Hero.tsx`, `components/home/QuickActions.tsx`, `components/home/Recommendations.tsx`

What's there:

- **Ask Ock search bar.** Submitting sends the user to `/assistant?q=<text>`. No API call happens here.
- **Suggestion chips:** "Plan a cheap date tonight", "Find live music near me", "I have 3 hours in Brooklyn". Each one opens the assistant with that prompt.
- **"Start with the classics":** four hard-coded places (L'Industrie Pizzeria, Red Hook Tavern, Ivan Ramen, Tompkins Square Bagels) with images, address and an "Ask Ock" link.
- **"Ock thinks you'd like...":** personalized picks for returning users. It's switched off by a constant (`hasOckHistory = false` in `app/home/page.tsx`) and uses three mock places.

The frontend already defines the shape it wants for personalized picks (`components/home/Recommendations.tsx`):

```ts
type OckPlaceRecommendation = {
  placeId: string;
  name: string;
  address?: string;
  neighborhood?: string;
  photoUrl?: string;          // falls back to a local image when missing
  photoAttribution?: string;  // shown under the card (needed for Google photos)
  category?: string;          // e.g. "LIVE MUSIC"
  price?: string;             // e.g. "From $20", "Free"
  subwayLines?: SubwayLine[]; // e.g. ["A", "C", "E"]
  reason: string;             // why Ock picked it for this user
  prompt: string;             // text sent to Ock when the user taps "Ask Ock about this"
};
```

Backend needs:

- `GET /api/recommendations/home` returning `{ hasHistory: boolean, places: OckPlaceRecommendation[] }` for the signed-in user.
- Optional: `GET /api/places/featured` so the classics aren't hard-coded.

## 3. Ock assistant (`/assistant`)

**Files:** `app/assistant/page.tsx`, `components/assistant/*`, `lib/ockMock.ts`

This is the main AI feature, and it's **100% mocked**. `resolveOckRequest()` in `lib/ockMock.ts` matches keywords with regular expressions and returns canned results.

What's there:

- A two-panel workspace: the conversation on the left and a **structured result** on the right (place cards or an itinerary, not just text).
- `/assistant?q=...` starts the conversation with that message (used by Home and Discover).
- **Starter prompts** on the empty state: "Cheap date tonight", "Live music under $30", "Build my Saturday", "Somewhere I've never been", "Best food near Columbia".
- **Adjustment chips** that change the current result: "Make it cheaper", "No ramen", "Add live music", "Less walking". The backend therefore needs to know the previous result, not just the last message.
- **Place cards** with image, category, price, neighborhood, address, a reason, subway lines, nearest station and travel time. Each card has "Ask Ock" (sends "Tell me more about <name>.") and "Get me there" (opens NextStop at `/navigate?destination=<name, address>`).
- **Itinerary view:** timed stops, walking time between stops, estimated total against budget, number of stops, number of neighborhoods, "Modify with Ock", and "Start the night" (opens NextStop to the first stop). Walk times ("8 min walk", "12 min walk") and "Neighborhoods: 2" are hard-coded in `ItineraryResult.tsx`.
- **Route handoff:** "get me to X" or "take me to X" produces a result that points the user to NextStop.
- **Voice input button** is present but disabled ("coming later"). ElevenLabs is already in the backend requirements.

The frontend expects this response shape (from `lib/ockMock.ts`). Returning it from the backend lets the frontend swap the mock for a `fetch` without changing any UI:

```ts
type OckResponse = {
  message: string;  // chat bubble text
  resultType: "places" | "activity" | "itinerary" | "route-handoff" | "empty";
  data:
    | { type: "empty" }
    | { type: "places" | "activity"; title: string; subtitle: string; places: OckPlace[] }
    | { type: "itinerary"; title: string; area: string; timeLabel: string;
        stops: ItineraryStop[]; total: string; budget: string }
    | { type: "route-handoff"; destination: string; message: string };
};

type OckPlace = {
  id: string; name: string; category: string; neighborhood: string; borough: string;
  address?: string; price?: string; subwayLines?: SubwayLine[]; travelTime?: string;
  reason: string; imagePath: string; photoUrl?: string; station?: string;
};

type ItineraryStop = {
  id: string; time: string; category: string; name: string; neighborhood: string;
  destination: string;  // text passed to NextStop for "Get me there"
  price: string; imagePath?: string; note?: string;
};
```

Backend needs:

- `POST /api/assistant/chat` with `{ message, conversationId?, currentResult? }` returning `OckResponse` plus a `conversationId`.
- An LLM that returns this JSON reliably. `backend/app/services/grok.py` on this branch already shows the pattern: xAI chat completions with a strict `json_schema` response format, then validation with Pydantic.
- Real place data (name, address, photo, price level, coordinates). Google Places or Backboard retrieval could supply it.
- Nearest subway station and lines for each place. The GTFS station data on `Backend/Database` can compute this from coordinates.
- Real walking and transit times between itinerary stops (the MTA planner can provide these), plus budget totals and a neighborhood count.
- Conversation storage for signed-in users. Backboard's persistent memory fits here, and the SDK is already in `Backend/Database`'s requirements.
- Later: speech-to-text and text-to-speech for the voice button.

## 4. Ock memory panel ("Ock knows")

**File:** `components/assistant/MemoryPanel.tsx` (no page renders it right now)

What's there:

- "Ock knows": a list of preference chips (for example "Loves jazz" or "Budget-friendly"). It takes `preferences: string[]`.
- "Today": an empty "No plans yet. Ask Ock to build your day." card.
- The labels say "Demo memory, not saved between visits."

Backend needs:

- `GET /api/users/me/preferences` returning `string[]`, plus a way to add and remove preferences (explicitly, or learned from chat).
- `GET /api/users/me/today` returning today's saved plan or itinerary.
- `database/schema.sql` on this branch already sketches a `preferences` table (`user_id`, `key`, `value`).

## 5. NextStop trip planner (`/navigate`)

**Files:** `app/navigate/page.tsx`, `components/citypilot/CityPilot.tsx`, `TripPlanner.tsx`, `LocationInput.tsx`, `RouteComparison.tsx`, `CityPilotMap.tsx`, `lib/route-options.ts`, `lib/route-metrics.ts`, `lib/location-suggestions.ts`

This is the most complete feature. Most of it talks to Google straight from the browser.

What's there:

- **From / To inputs with autocomplete.** Uses Google Places in the browser, is limited to NYC bounds, ranks nearest matches first, and falls back to a "Search on Google Maps" link on error. The origin defaults to Columbia University.
- **Deep link:** `/navigate?destination=<text>` pre-fills "To" (used by Ock and the classics).
- **Arrive-by date and time.** Defaults to one hour from now and must be within the next 100 days.
- **Preferred mode** (Transit, Drive, Walk). All three are always compared.
- **Optional driving cost** in dollars (fuel, tolls, parking).
- **Route comparison** using Google's Routes API in the browser: duration, distance, cost, walking minutes, transfers, transfer wait time, service headway, and whether the user can arrive on time. Metrics are calculated in `lib/route-metrics.ts`.
- **Grok recommendation** (see below).
- **Route details:** estimated leave-by and arrival times, step-by-step directions, Google warnings, and "Open directions in Google Maps."
- **Interactive map** that draws the selected route with start and end markers.

### Grok recommendation: `POST /api/trips/recommend`

This is the one real backend call in the app. It's implemented on this branch's placeholder backend (`backend/app/api/trips.py`, `backend/app/schemas/route_recommendation.py`, `backend/app/services/grok.py`, and the env vars `GROK_API_KEY` and `GROK_MODEL=grok-4.7`). **It doesn't exist on `Backend/Database`**, so once the frontend points at the real backend this panel always shows "Grok is unavailable."

Request (at most 3 options, each mode at most once):

```json
{
  "options": [
    {
      "mode": "Transit",
      "durationMinutes": 34.5,
      "distanceMeters": 9800,
      "cost": 2.9,
      "currency": "USD",
      "costNote": "Google fare estimate",
      "walkingMinutes": 9,
      "transfers": 1,
      "transferWaitMinutes": 4,
      "serviceHeadwayMinutes": 8,
      "canArriveOnTime": true
    }
  ]
}
```

Response:

```json
{ "mode": "Transit", "reason": "…", "tradeoffs": ["…", "…"] }
```

Frontend rules: `mode` must be one of the modes that were sent, `reason` must be a string, and `tradeoffs` must be a list of 1 to 3 strings. The browser gives up after 30 seconds. On an error it shows the response's `detail` string.

Backend needs:

- **Port `POST /api/trips/recommend` into `Backend/Database`** as-is. It's three small files and two env vars. This is the fastest win, because the frontend already depends on it.
- Decide how the MTA planner fits in. The frontend never calls `POST /api/trips` on `Backend/Database`, which has live MTA arrivals, arrive-by planning and a safety buffer. Options:
  - add an "MTA live" transit option next to Google's, or
  - use it to drive the not-yet-wired components in section 6.
- Saved trips: nothing is saved from NextStop today. `POST /api/trips` on `Backend/Database` already stores trips, and `GET /api/trips` lists them.
- Shared meetings: `Backend/Database` has `POST /api/meetings` and produces share links at `SHARE_URL_BASE` (`http://localhost:3000/meet/<code>`), but **the frontend has no `/meet` page**. One side needs to change.

## 6. NextStop extras: designed, not wired

**Files:** `components/citypilot/LeaveTimeCard.tsx`, `TripBreakdown.tsx`, `RouteTimeline.tsx`, `ActiveTripView.tsx`

These components are finished but nothing renders them, and their numbers are hard-coded. They match what `POST /api/trips` on `Backend/Database` already returns, so they're a good target once the frontend uses the MTA planner.

| Component | What it shows | Where the data can come from |
|---|---|---|
| `LeaveTimeCard` | Big "Leave at" time, ETA, arrive-by target, "N minutes early," on-time badge | `leave_at` and `arrive_at` from the planner, plus the requested `arrive_by` |
| `TripBreakdown` ("Why leave then?") | Ride minutes, walking minutes, safety buffer, total, and why there's a buffer | Planner legs and `buffer_minutes` |
| `RouteTimeline` | Ordered steps (place, walk, transit with line badge, drive) with durations | Planner `legs` (subway legs include `route`) |
| `ActiveTripView` | Live ETA, next instruction, progress bar, "Return to trip plan." Says "Live GPS and service alerts are not connected." | Live trains and service alerts from the realtime feed, via polling (for example `GET /api/trips/{id}/live`) or a WebSocket |

## 7. Discover (`/discover`)

**Files:** `app/discover/page.tsx`, `components/discover/*`, `lib/recommendations.ts`

Discover isn't linked in the navbar (which only shows Ock and NextStop). You can reach it by typing the URL.

What's there:

- A search box for places, neighborhoods, food, music and events.
- Category chips: For You, Food & drink, Live music, Events, Outdoors, Culture, Neighborhoods.
- A borough dropdown with all five boroughs.
- A results list: image, category, title, neighborhood and borough, description, subway lines, travel time, price.
- **Save/bookmark** on each card and in the detail view. Saved places are kept in React state only and lost on refresh.
- A **detail dialog**: description, nearby subway lines and station, walk from the station, price guide, Save, and "Get me there with NextStop."
- A **map placeholder** ("Live place and transit data will appear here").
- A mobile toggle between results and map.
- Data: six hard-coded entries in `lib/recommendations.ts`, filtered in the browser. The empty state says the samples only cover Manhattan and Brooklyn.

Place shape the UI uses:

```ts
type Recommendation = {
  id: string;
  title: string;
  neighborhood: string;
  borough: string;
  category: "Food & drink" | "Live music" | "Outdoors" | "Culture" | "Neighborhoods" | "Events";
  description: string;
  image: string;
  imageAlt: string;
  price?: string;
  lines?: SubwayLine[];  // nearby subway lines
  away: string;          // e.g. "12 min away"
  walk: string;          // e.g. "5 min walk from the station"
  station: string;       // nearest station name
  tags: string[];        // used for search matching
  accessible?: boolean;
};
```

Backend needs:

- `GET /api/discover?q=&category=&borough=` returning `Recommendation[]`. `api.ts` already has `getPlaces()` pointing at `/api/discover`, but it expects an older `{ id, name, neighborhood, summary }` type, so the frontend type needs updating to match.
- Coordinates (`lat`, `lng`) on each place so the map can show pins. The type doesn't include them yet.
- Nearest station, lines and walking time computed from coordinates using the GTFS station data. `GET /api/stations` and `GET /api/places` on `Backend/Database` are search and autocomplete endpoints, not a place catalog, but the station-lookup code can be reused.
- "For You" should be personalized for signed-in users.
- Saved places: `GET /api/users/me/saved`, `POST /api/users/me/saved/{placeId}`, `DELETE /api/users/me/saved/{placeId}`.
- Frontend bug to fix alongside this: "Get me there with NextStop" in the detail dialog links to `/navigate` without the place, so NextStop opens on its default destination. It should use `/navigate?destination=...` like Ock does.

## 8. Profile (`/profile`)

**File:** `app/profile/page.tsx`

What's there:

- Guests see "You're exploring as a guest" and a Create account button.
- Signed-in users trigger `GET /api/users/me` and see a name and neighborhood. The page says "Preferences are not stored yet."
- There are loading and error states.

Backend needs:

- `GET /api/users/me` returning `{ id, name, neighborhood }` (the current `UserProfile` type). Feel free to extend it with email and preferences.
- `PATCH /api/users/me` to edit profile fields.
- Preferences (see section 4).

## 9. Hello-world leftovers

Nothing renders these. They come from the original scaffold and match the placeholder API in `docs/api.md`:

- `components/ChatBox.tsx` with `hooks/useWebSocket.ts`: a basic chat over `WS /ws` that echoes messages. It's superseded by the Ock workspace.
- `components/PlaceCard.tsx`, `components/TripCard.tsx`, `components/Map.tsx`, `components/ui/Button.tsx`
- `getPlaces()` and `getTrips()` in `lib/api.ts`

Delete them, or reuse the WebSocket hook for live trip updates in `ActiveTripView`.

---

## Where the frontend and `Backend/Database` disagree

| Topic | Frontend expects | `Backend/Database` has |
|---|---|---|
| Grok route pick | `POST /api/trips/recommend` | Missing (only on the placeholder backend) |
| Current user | `GET /api/users/me` | Missing; no users table |
| Discover feed | `GET /api/discover` | Missing. `/api/places` is autocomplete, not a catalog. |
| Assistant | `POST /api/assistant/chat` (in `docs/api.md`) | Missing |
| Trip list | `GET /api/trips` with `{ id, title, origin, destination, summary }` | Present, and returns those fields plus extras |
| Trip planning | Google Routes in the browser | `POST /api/trips` with live MTA data, which the frontend doesn't call |
| Share links | No `/meet` page | Generates `http://localhost:3000/meet/<code>` |
| Grok env vars | `GROK_API_KEY`, `GROK_MODEL` | Not defined |
| CORS | Needs credentials once auth exists | `*` with `allow_credentials=False` |

## Suggested order

1. **Port `POST /api/trips/recommend`** to `Backend/Database` and add `GROK_API_KEY` and `GROK_MODEL`. The frontend already calls it.
2. **`POST /api/assistant/chat`** returning `OckResponse`, so `lib/ockMock.ts` can be replaced.
3. **`GET /api/discover`** with real places, coordinates and nearest stations.
4. **Auth, `GET /api/users/me`, preferences and saved places.** This unlocks Profile, the memory panel, "For You" and personalized home picks.
5. **Connect NextStop to the MTA planner** for leave-time, breakdown, timeline and the live active-trip view, and settle the `/meet` share-link question.
6. **Voice** for Ock.
