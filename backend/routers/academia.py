from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import AcademiaStatus
from schemas import StatusIn, StatusOut

router = APIRouter()

VALORES_VALIDOS = {"fechado", "vazio", "tranquilo", "cheio", "lotado"}


def _get_or_create(db: Session) -> AcademiaStatus:
    row = db.get(AcademiaStatus, 1)
    if not row:
        row = AcademiaStatus(id=1, ativo=False, status="fechado")
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("/academia/status", response_model=StatusOut)
def get_status(db: Session = Depends(get_db)):
    return _get_or_create(db)


@router.put("/academia/status", response_model=StatusOut)
def set_status(body: StatusIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    if body.status not in VALORES_VALIDOS:
        body.status = "fechado"
    row = _get_or_create(db)
    row.ativo = body.ativo
    row.status = body.status
    db.commit()
    db.refresh(row)
    return row
