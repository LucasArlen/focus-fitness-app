import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import Bloco, Desafio, ExercicioBanco, Linha, Treino
from schemas import TreinoIn, TreinoOut, TreinoResumoOut

router = APIRouter()


@router.get("/treino/historico", response_model=list[TreinoResumoOut])
def get_historico(limite: int = 30, db: Session = Depends(get_db)):
    treinos = (
        db.query(Treino)
        .filter(Treino.publicado == True)
        .order_by(Treino.data.desc())
        .limit(limite)
        .all()
    )
    result = []
    for t in treinos:
        total_ex = sum(len(b.linhas) for b in t.blocos)
        result.append(TreinoResumoOut(
            id=t.id,
            data=t.data,
            total_blocos=len(t.blocos),
            total_exercicios=total_ex,
            nomes_blocos=[b.nome for b in t.blocos],
            desafio_nome=t.desafio.nome if t.desafio else None,
        ))
    return result


@router.get("/treino/hoje", response_model=TreinoOut)
def get_treino_hoje(db: Session = Depends(get_db)):
    treino = db.query(Treino).filter(Treino.data == datetime.date.today()).first()
    if not treino:
        raise HTTPException(404, "Nenhum treino para hoje")
    return treino


@router.get("/treino/{treino_id}", response_model=TreinoOut)
def get_treino(treino_id: int, db: Session = Depends(get_db)):
    treino = db.get(Treino, treino_id)
    if not treino:
        raise HTTPException(404, "Treino não encontrado")
    return treino


@router.post("/treino", response_model=TreinoOut)
def create_treino(body: TreinoIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    hoje = datetime.date.today()

    existente = db.query(Treino).filter(Treino.data == hoje).first()
    if existente:
        db.delete(existente)
        db.commit()

    treino = Treino(data=hoje, publicado=True)
    db.add(treino)
    db.flush()

    for i, b in enumerate(body.blocos):
        bloco = Bloco(treino_id=treino.id, nome=b.nome, ordem=i, sugestao=b.sugestao)
        db.add(bloco)
        db.flush()
        for l in b.linhas:
            db.add(Linha(bloco_id=bloco.id, exercicio=l.exercicio, serie=l.serie, dropset=l.dropset))
            # Auto-populate banco de exercícios
            nome = l.exercicio.strip()
            if nome and not db.query(ExercicioBanco).filter(ExercicioBanco.nome == nome).first():
                db.add(ExercicioBanco(nome=nome))

    if body.desafio_nome:
        db.add(Desafio(treino_id=treino.id, nome=body.desafio_nome, fechado=False))

    db.commit()
    db.refresh(treino)

    # Push notification to all subscribers
    try:
        from routers.push import send_push_to_all
        send_push_to_all(
            db,
            title="Treino publicado! 💪",
            body="O treino de hoje está disponível. Bora treinar!",
        )
    except Exception:
        pass

    return treino
