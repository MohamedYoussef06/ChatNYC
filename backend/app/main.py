import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.meetings import router as meetings_router
from app.api.assistant import router as assistant_router
from app.api.places import router as places_router
from app.api.stations import router as stations_router
from app.api.transit import router as transit_router
from app.api.trips import router as trips_router
from app.api.weather import router as weather_router
from app.api.wallet import router as wallet_router
from app.config import cors_origin_list
from app.db import close_mongo, connect_mongo, init_db, mongo_status
from app.feeds.realtime import live_store, updated_at_iso
from app.feeds.static_gtfs import current_graph, load, load_error
from app.routing import timetable

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    await connect_mongo()
    await asyncio.to_thread(load)
    await asyncio.to_thread(timetable.after_load)
    stop = asyncio.Event()
    poller = asyncio.create_task(live_store.poll_loop(stop))
    reloader = asyncio.create_task(timetable.daily_reload(stop))
    try:
        yield
    finally:
        stop.set()
        poller.cancel()
        reloader.cancel()
        with suppress(asyncio.CancelledError):
            await poller
        with suppress(asyncio.CancelledError):
            await reloader
        await close_mongo()


app = FastAPI(
    title="NYC Trip Planner",
    description="Solo NYC subway trip plans with live MTA arrivals and shareable meeting snapshots.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origin_list(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(stations_router, prefix="/api")
app.include_router(trips_router, prefix="/api")
app.include_router(meetings_router, prefix="/api")
app.include_router(assistant_router, prefix="/api/assistant")
app.include_router(places_router, prefix="/api")
app.include_router(transit_router, prefix="/api")
app.include_router(weather_router, prefix="/api")
app.include_router(wallet_router, prefix="/api")


@app.get("/health")
async def health() -> dict:
    graph = current_graph()
    snapshot = live_store.snapshot()
    table = timetable.current()
    return {
        "status": "ok" if graph is not None else "degraded",
        "gtfs_loaded": graph is not None,
        "stations": len(graph.stations) if graph is not None else 0,
        "live": snapshot.fresh,
        "feeds_updated_at": updated_at_iso(snapshot),
        "detail": load_error(),
        "timetable_trips": len(table.trips) if table is not None else 0,
        "live_trains": len(snapshot.trips),
        "mongo": await mongo_status(),
    }
