from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import require_any
from database import get_db
from models import Reacao

router = APIRouter()


class ReacaoIn(BaseModel):
    bloco_id: int
    emoji: str


@router.post("/reacao")
def toggle_reacao(body: ReacaoIn, db: Session = Depends(get_db), user=Depends(require_any)):
    if user.get("role") != "aluno":
        raise HTTPException(403, "Apenas alunos podem reagir")

    aluno_id = int(user["sub"])
    existente = db.query(Reacao).filter(
        Reacao.aluno_id == aluno_id,
        Reacao.bloco_id == body.bloco_id,
        Reacao.emoji == body.emoji,
    ).first()

    if existente:
        db.delete(existente)
        db.commit()
        return {"acao": "removida"}

    db.add(Reacao(aluno_id=aluno_id, bloco_id=body.bloco_id, emoji=body.emoji))
    db.commit()
    return {"acao": "adicionada"}
