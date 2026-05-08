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


@router.get("/reacao")
def get_reacoes(bloco_ids: str, db: Session = Depends(get_db), user=Depends(require_any)):
    ids = [int(x) for x in bloco_ids.split(",") if x.strip().isdigit()]
    if not ids:
        return {}

    reacoes = db.query(Reacao).filter(Reacao.bloco_id.in_(ids)).all()
    aluno_id = int(user["sub"]) if user.get("role") == "aluno" else None

    result = {}
    for bid in ids:
        contagens = {}
        meu_emoji = None
        for r in reacoes:
            if r.bloco_id == bid:
                contagens[r.emoji] = contagens.get(r.emoji, 0) + 1
                if aluno_id and r.aluno_id == aluno_id:
                    meu_emoji = r.emoji
        result[str(bid)] = {"contagens": contagens, "meu_emoji": meu_emoji}

    return result


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
