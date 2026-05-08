import datetime
import os

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import Base, engine, SessionLocal
from routers import academia, aluno, banco, desafio, invite, presenca, push, ranking, reacao, treino

Base.metadata.create_all(bind=engine)

# ─── Migrações automáticas (adiciona colunas novas sem apagar dados) ──────────

def _auto_migrate():
    from sqlalchemy import text
    with engine.connect() as conn:
        # alunos
        cols_alunos = [row[1] for row in conn.execute(text("PRAGMA table_info(alunos)")).fetchall()]
        if "apelido" not in cols_alunos:
            conn.execute(text("ALTER TABLE alunos ADD COLUMN apelido TEXT"))
        if "foto" not in cols_alunos:
            conn.execute(text("ALTER TABLE alunos ADD COLUMN foto TEXT"))
        # reacoes: migra de bloco_id → linha_id
        cols_reacoes = [row[1] for row in conn.execute(text("PRAGMA table_info(reacoes)")).fetchall()]
        if "linha_id" not in cols_reacoes:
            conn.execute(text("ALTER TABLE reacoes ADD COLUMN linha_id INTEGER"))
        conn.commit()

_auto_migrate()

def _ensure_invite_code():
    """Gera código de convite na primeira vez que o servidor sobe."""
    import secrets
    db = SessionLocal()
    try:
        from models import AppConfig
        if not db.query(AppConfig).filter(AppConfig.key == "invite_code").first():
            db.add(AppConfig(key="invite_code", value=secrets.token_urlsafe(6)))
            db.commit()
    finally:
        db.close()


_ensure_invite_code()

# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="Quadro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")
api.include_router(academia.router)
api.include_router(treino.router)
api.include_router(desafio.router)
api.include_router(aluno.router)
api.include_router(reacao.router)
api.include_router(banco.router)
api.include_router(ranking.router)
api.include_router(presenca.router)
api.include_router(push.router)
api.include_router(invite.router)
app.include_router(api)

STATIC = "static"
if os.path.exists(STATIC):
    app.mount("/assets", StaticFiles(directory=f"{STATIC}/assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        arquivo = f"{STATIC}/{full_path}"
        if full_path and os.path.isfile(arquivo):
            return FileResponse(arquivo)
        return FileResponse(f"{STATIC}/index.html")
