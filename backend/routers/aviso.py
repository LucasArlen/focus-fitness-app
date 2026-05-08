import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import require_admin, require_any
from database import get_db
from models import Aviso, Confirmacao
from schemas import AvisoIn, AvisoOut

router = APIRouter()


def _ativos(db: Session):
    hoje = datetime.date.today()
    return db.query(Aviso).filter(Aviso.expira_em >= hoje).order_by(Aviso.criado_em.desc()).all()


@router.get("/avisos", response_model=list[AvisoOut])
def listar_avisos(db: Session = Depends(get_db)):
    return _ativos(db)


@router.post("/avisos", response_model=AvisoOut)
def criar_aviso(body: AvisoIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    if body.categoria not in ("aviso", "evento", "feriado"):
        raise HTTPException(400, "Categoria inválida")
    aviso = Aviso(
        titulo=body.titulo.strip(),
        corpo=body.corpo,
        foto=body.foto,
        categoria=body.categoria,
        data_evento=body.data_evento,
        expira_em=body.expira_em,
    )
    db.add(aviso)
    db.commit()
    db.refresh(aviso)
    return aviso


@router.delete("/avisos/{aviso_id}")
def deletar_aviso(aviso_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    aviso = db.get(Aviso, aviso_id)
    if not aviso:
        raise HTTPException(404, "Aviso não encontrado")
    db.delete(aviso)
    db.commit()
    return {"ok": True}


@router.post("/avisos/{aviso_id}/confirmar")
def confirmar(aviso_id: int, db: Session = Depends(get_db), user=Depends(require_any)):
    if user.get("role") != "aluno":
        raise HTTPException(403, "Apenas alunos podem confirmar")
    aviso = db.get(Aviso, aviso_id)
    if not aviso or aviso.categoria != "evento":
        raise HTTPException(404, "Evento não encontrado")
    nome = user.get("nome")
    existente = db.query(Confirmacao).filter(
        Confirmacao.aviso_id == aviso_id,
        Confirmacao.aluno_nome == nome,
    ).first()
    if existente:
        db.delete(existente)
        db.commit()
        return {"confirmado": False}
    db.add(Confirmacao(aviso_id=aviso_id, aluno_nome=nome))
    db.commit()
    return {"confirmado": True}
