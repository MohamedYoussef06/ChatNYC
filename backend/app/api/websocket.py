from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.grok import complete

router = APIRouter()


@router.websocket("/ws")
async def assistant_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_text()
            await websocket.send_text(complete(message))
    except WebSocketDisconnect:
        return
