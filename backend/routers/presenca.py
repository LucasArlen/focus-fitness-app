import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import require_any
from database import get_db
from models import Presenca, Treino

router = APIRouter()


def _treino_hoje(db: Session) -> Treino:
    t = db.query(Treino).filter(Treino.data == datetime.date.today()).first()
    if not t:
        raise HTTPException(404, "Nenhum treino hoje")
    return t


@router.get("/treino/hoje/presencas")
def get_presencas(db: Session = Depends(get_db)):
    try:
        treino = _treino_hoje(db)
    except HTTPException:
        return {"nomes": [], "total": 0}
    ps = db.query(Presenca).filter(Presenca.treino_id == treino.id).all()
    return {"nomes": [p.aluno_nome for p in ps], "total": len(ps)}


@router.post("/treino/hoje/presenca")
def confirmar(db: Session = Depends(get_db), payload=Depends(require_any)):
    nome = payload.get("nome")
    if not nome:
        raise HTTPException(400, "Token sem nome de aluno")
    treino = _treino_hoje(db)
    existe = db.query(Presenca).filter(
        Presenca.treino_id == treino.id,
        Presenca.aluno_nome == nome
    ).first()
    if not existe:
        db.add(Presenca(treino_id=treino.id, aluno_nome=nome))
        db.commit()
    return {"ok": True, "nome": nome}


@router.delete("/treino/hoje/presenca")
def cancelar(db: Session = Depends(get_db), payload=Depends(require_any)):
    nome = payload.get("nome")
    if not nome:
        raise HTTPException(400, "Token sem nome de aluno")
    try:
        treino = _treino_hoje(db)
        db.query(Presenca).filter(
            Presenca.treino_id == treino.id,
            Presenca.aluno_nome == nome
        ).delete()
        db.commit()
    except HTTPException:
        pass
    return {"ok": True}
