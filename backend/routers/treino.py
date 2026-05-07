import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import Bloco, Desafio, Linha, Treino
from schemas import TreinoIn, TreinoOut

router = APIRouter()


@router.get("/treino/hoje", response_model=TreinoOut)
def get_treino_hoje(db: Session = Depends(get_db)):
    treino = db.query(Treino).filter(Treino.data == datetime.date.today()).first()
    if not treino:
        raise HTTPException(404, "Nenhum treino para hoje")
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

    if body.desafio_nome:
        db.add(Desafio(treino_id=treino.id, nome=body.desafio_nome, fechado=False))

    db.commit()
    db.refresh(treino)
    return treino
