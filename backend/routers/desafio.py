import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import Desafio, Pontuacao, Treino
from schemas import DesafioOut, PontuacaoIn, PontuacaoOut

router = APIRouter()


def _desafio_hoje(db: Session) -> Desafio:
    treino = db.query(Treino).filter(Treino.data == datetime.date.today()).first()
    if not treino or not treino.desafio:
        raise HTTPException(404, "Nenhum desafio para hoje")
    return treino.desafio


@router.get("/desafio/hoje", response_model=DesafioOut)
def get_desafio_hoje(db: Session = Depends(get_db)):
    return _desafio_hoje(db)


@router.post("/desafio/{desafio_id}/pontuacao", response_model=PontuacaoOut)
def add_pontuacao(desafio_id: int, body: PontuacaoIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    desafio = db.get(Desafio, desafio_id)
    if not desafio:
        raise HTTPException(404, "Desafio não encontrado")

    existente = next((p for p in desafio.pontuacoes if p.aluno_nome == body.aluno_nome), None)
    if existente:
        existente.valor = body.valor
        db.commit()
        db.refresh(existente)
        return existente

    p = Pontuacao(
        desafio_id=desafio_id,
        aluno_nome=body.aluno_nome,
        valor=body.valor,
        ordem=len(desafio.pontuacoes) + 1,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/pontuacao/{pontuacao_id}")
def delete_pontuacao(pontuacao_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    p = db.get(Pontuacao, pontuacao_id)
    if not p:
        raise HTTPException(404, "Pontuação não encontrada")
    db.delete(p)
    db.commit()
    return {"ok": True}


@router.put("/desafio/{desafio_id}/fechar")
def fechar_desafio(desafio_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    desafio = db.get(Desafio, desafio_id)
    if not desafio:
        raise HTTPException(404, "Desafio não encontrado")
    desafio.fechado = True
    db.commit()
    return {"ok": True}
