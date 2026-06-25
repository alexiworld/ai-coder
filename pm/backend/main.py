from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import get_connection, init_db
from backend.routers.auth import router as auth_router
from backend.routers.board import router as board_router
from backend.routers.ai import router as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    conn = get_connection()
    try:
        init_db(conn)
    finally:
        conn.close()
    yield


app = FastAPI(title="Kanban Studio API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(board_router)
app.include_router(ai_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


frontend_dir = Path(__file__).resolve().parent.parent / "frontend" / "out"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
