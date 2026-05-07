from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import ExercicioBanco
from schemas import ExercicioOut

router = APIRouter()


@router.get("/banco/exercicios", response_model=list[ExercicioOut])
def get_banco(db: Session = Depends(get_db)):
    return db.query(ExercicioBanco).order_by(ExercicioBanco.nome).all()
