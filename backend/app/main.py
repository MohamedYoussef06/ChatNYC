from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import assistant, discover, trips, users, websocket
from app.config import settings

app = FastAPI(title="nyc-companion")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assistant.router, prefix="/api/assistant", tags=["assistant"])
app.include_router(discover.router, prefix="/api/discover", tags=["discover"])
app.include_router(trips.router, prefix="/api/trips", tags=["trips"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(websocket.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
