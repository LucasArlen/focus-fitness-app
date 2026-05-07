import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import Aluno, Presenca, Treino

router = APIRouter()


def _treino_hoje(db: Session) -> Treino:
    t = db.query(Treino).filter(Treino.data == datetime.date.today()).first()
    if not t:
        raise HTTPException(404, "Nenhum treino hoje")
    return t


@router.get("/treino/hoje/presencas")
def get_presencas(db: Session = Depends(get_db)):
    """Retorna lista de presenças confirmadas hoje (público)."""
    try:
        treino = _treino_hoje(db)
    except HTTPException:
        return {"nomes": [], "total": 0}
    ps = db.query(Presenca).filter(Presenca.treino_id == treino.id).all()
    return {"nomes": [p.aluno_nome for p in ps], "total": len(ps)}


@router.get("/treino/hoje/chamada")
def get_chamada(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Admin: retorna todos os alunos com flag de presença."""
    alunos = db.query(Aluno).order_by(Aluno.nome).all()
    presentes = set()
    try:
        treino = _treino_hoje(db)
        ps = db.query(Presenca).filter(Presenca.treino_id == treino.id).all()
        presentes = {p.aluno_nome for p in ps}
    except HTTPException:
        pass
    return [
        {"nome": a.nome, "presente": a.nome in presentes}
        for a in alunos
    ]


@router.post("/treino/hoje/presenca/{nome}")
def marcar(nome: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    """Admin: marca presença de um aluno específico."""
    treino = _treino_hoje(db)
    existe = db.query(Presenca).filter(
        Presenca.treino_id == treino.id,
        Presenca.aluno_nome == nome
    ).first()
    if not existe:
        db.add(Presenca(treino_id=treino.id, aluno_nome=nome))
        db.commit()
    return {"ok": True, "nome": nome, "presente": True}


@router.delete("/treino/hoje/presenca/{nome}")
def desmarcar(nome: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    """Admin: desmarca presença de um aluno específico."""
    try:
        treino = _treino_hoje(db)
        db.query(Presenca).filter(
            Presenca.treino_id == treino.id,
            Presenca.aluno_nome == nome
        ).delete()
        db.commit()
    except HTTPException:
        pass
    return {"ok": True, "nome": nome, "presente": False}
