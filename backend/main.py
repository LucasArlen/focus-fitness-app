import datetime
import os

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import Base, engine, SessionLocal
from routers import academia, aluno, banco, desafio, invite, presenca, push, ranking, reacao, treino

Base.metadata.create_all(bind=engine)

# ─── Seed de dados de demonstração ────────────────────────────────────────────

_ALUNOS = [
    "João Silva", "Maria Fernanda", "Pedro Costa", "Ana Lima",
    "Carlos Mendes", "Juliana Santos", "Rafael Oliveira", "Beatriz Rocha",
    "Lucas Pereira", "Gabriela Sousa", "Thiago Alves", "Camila Ramos",
]

_TREINOS = [
    {
        "dias": 5,
        "blocos": [
            ("Aquecimento", False, [
                ("Polichinelo", "3x30", False),
                ("Agachamento Livre", "3x20", False),
                ("Mobilidade de Quadril", "2x10 cada lado", False),
            ]),
            ("Circuito HIIT", False, [
                ("Burpee", "5x10", False),
                ("Box Jump", "4x12", False),
                ("Kettlebell Swing", "4x20", False),
                ("Thruster com Halter", "3x10", True),
            ]),
            ("Finisher", True, [
                ("Prancha Isométrica", "3x45seg", False),
                ("Mountain Climber", "3x30", False),
            ]),
        ],
        "desafio": "Burpee — máx reps em 2 minutos",
        "pontos": [45, 38, 52, 41, 48, 35, 56, 33, 49, 37, 42, 29],
    },
    {
        "dias": 4,
        "blocos": [
            ("Aquecimento", False, [
                ("Corrida Estacionária", "3 minutos", False),
                ("Mobilidade Torácica", "2x8", False),
            ]),
            ("Força e Potência", False, [
                ("Agachamento c/ Salto", "4x15", False),
                ("Remada com Halter", "4x12", False),
                ("Push-up com Rotação", "3x10", False),
                ("Devil Press", "3x8", True),
            ]),
            ("Mobilidade", True, [
                ("Alongamento Posterior", "3x30seg", False),
                ("Pigeon Pose", "2x45seg cada lado", False),
            ]),
        ],
        "desafio": "Agachamento c/ Salto — máx reps em 90 seg",
        "pontos": [62, 55, 71, 48, 67, 43, 78, 51, 64, 46],
    },
    {
        "dias": 3,
        "blocos": [
            ("Aquecimento", False, [
                ("Corda Naval", "3x30seg", False),
                ("Step Alternado", "3x20", False),
            ]),
            ("Circuito Kettlebell", False, [
                ("Kettlebell Swing", "5x20", False),
                ("Turkish Get-Up", "3x5 cada lado", False),
                ("Goblet Squat", "4x15", False),
            ]),
        ],
        "desafio": "Kettlebell Swing — máx reps em 2 minutos",
        "pontos": [87, 74, 91, 68, 83, 61, 95, 72, 88, 65, 79, 58],
    },
    {
        "dias": 2,
        "blocos": [
            ("Aquecimento", False, [
                ("Polichinelo", "3x30", False),
                ("Flexão de Braço", "3x15", False),
            ]),
            ("AMRAP 20 min", False, [
                ("Wall Ball", "15 reps", False),
                ("Rope Climber", "3 reps", False),
                ("Air Squat", "20 reps", False),
                ("Push-up", "10 reps", False),
            ]),
            ("Core", True, [
                ("Abdominal Bicicleta", "3x30", False),
                ("V-Up", "3x20", False),
            ]),
        ],
        "desafio": "Wall Ball — máx reps em 90 seg",
        "pontos": [54, 47, 61, 39, 58, 34, 66, 43, 55, 38],
    },
    {
        "dias": 1,
        "blocos": [
            ("Aquecimento", False, [
                ("Corrida Estacionária", "3 minutos", False),
                ("Mobilidade de Ombros", "2x10", False),
            ]),
            ("Pull & Push", False, [
                ("Pull-up", "5x max", False),
                ("Dips", "4x12", False),
                ("Remada Invertida", "4x15", False),
                ("Handstand Push-up", "3x8", True),
            ]),
            ("Finisher", True, [
                ("Prancha Lateral", "3x30seg cada lado", False),
                ("Superman", "3x15", False),
            ]),
        ],
        "desafio": "Pull-up — máx reps seguidas",
        "pontos": [12, 8, 15, 7, 11, 6, 18, 9, 13, 5, 10, 4],
    },
    {
        "dias": 0,  # hoje
        "blocos": [
            ("Aquecimento", False, [
                ("Polichinelo", "3x30", False),
                ("Mobilidade de Quadril", "2x10 cada lado", False),
                ("Agachamento Goblet", "3x15", False),
            ]),
            ("Circuito Principal", False, [
                ("Burpee Box Jump", "4x10", False),
                ("Thruster com Halter", "4x12", True),
                ("Kettlebell Swing", "4x20", False),
                ("Rope Jump", "4x50", False),
            ]),
            ("Finisher", True, [
                ("Prancha Lateral", "3x30seg cada lado", False),
                ("V-Up", "3x20", False),
            ]),
        ],
        "desafio": "Thruster — máx reps em 2 minutos",
        "pontos": [],  # alunos ainda chegando
    },
]


def _seed(db):
    from models import Bloco, Desafio, ExercicioBanco, Linha, Pontuacao, Treino
    if db.query(Treino).count() > 0:
        return  # já tem dados, não sobrescreve

    hoje = datetime.date.today()
    for td in _TREINOS:
        data = hoje - datetime.timedelta(days=td["dias"])
        t = Treino(data=data, publicado=True)
        db.add(t)
        db.flush()

        for i, (nome_b, sugestao, linhas) in enumerate(td["blocos"]):
            b = Bloco(treino_id=t.id, nome=nome_b, ordem=i, sugestao=sugestao)
            db.add(b)
            db.flush()
            for exercicio, serie, dropset in linhas:
                db.add(Linha(bloco_id=b.id, exercicio=exercicio, serie=serie, dropset=dropset))
                ex = exercicio.strip()
                if ex and not db.query(ExercicioBanco).filter(ExercicioBanco.nome == ex).first():
                    db.add(ExercicioBanco(nome=ex))

        if td["desafio"]:
            fechado = td["dias"] > 0
            d = Desafio(treino_id=t.id, nome=td["desafio"], fechado=fechado)
            db.add(d)
            db.flush()
            for j, valor in enumerate(td["pontos"]):
                nome_aluno = _ALUNOS[j % len(_ALUNOS)]
                db.add(Pontuacao(desafio_id=d.id, aluno_nome=nome_aluno, valor=str(valor), ordem=j))

    db.commit()


def _run_seed():
    db = SessionLocal()
    try:
        _seed(db)
    finally:
        db.close()


_run_seed()


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
