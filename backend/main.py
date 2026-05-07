import os
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers import aluno, desafio, reacao, treino

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Quadro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Todas as rotas da API sob /api
api = APIRouter(prefix="/api")
api.include_router(treino.router)
api.include_router(desafio.router)
api.include_router(aluno.router)
api.include_router(reacao.router)
app.include_router(api)

# Servir o frontend em produção (após npm run build)
STATIC = "static"
if os.path.exists(STATIC):
    app.mount("/assets", StaticFiles(directory=f"{STATIC}/assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        arquivo = f"{STATIC}/{full_path}"
        if full_path and os.path.isfile(arquivo):
            return FileResponse(arquivo)
        return FileResponse(f"{STATIC}/index.html")
