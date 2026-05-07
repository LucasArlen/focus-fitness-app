import datetime
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Desafio, Pontuacao, Treino
from schemas import RankingAnualItem, EvolucaoItem

router = APIRouter()


def _num(valor: str) -> float:
    """Extrai o número de um valor texto como '87rpt', '45kg', '300'."""
    digits = "".join(c for c in valor if c.isdigit() or c == ".")
    return float(digits) if digits else 0.0


@router.get("/ranking/anual", response_model=list[RankingAnualItem])
def get_ranking_anual(db: Session = Depends(get_db)):
    ano = datetime.date.today().year
    pontuacoes = (
        db.query(Pontuacao)
        .join(Desafio, Pontuacao.desafio_id == Desafio.id)
        .join(Treino, Desafio.treino_id == Treino.id)
        .filter(func.strftime("%Y", Treino.data) == str(ano))
        .all()
    )

    alunos: dict = defaultdict(lambda: {"participacoes": 0, "total": 0.0, "melhor": 0.0})
    for p in pontuacoes:
        val = _num(p.valor)
        alunos[p.aluno_nome]["participacoes"] += 1
        alunos[p.aluno_nome]["total"] += val
        alunos[p.aluno_nome]["melhor"] = max(alunos[p.aluno_nome]["melhor"], val)

    return sorted(
        [RankingAnualItem(nome=k, **v) for k, v in alunos.items()],
        key=lambda x: x.total,
        reverse=True,
    )


@router.get("/ranking/aluno/{nome}", response_model=list[EvolucaoItem])
def get_evolucao_aluno(nome: str, db: Session = Depends(get_db)):
    rows = (
        db.query(Pontuacao, Desafio.nome, Treino.data)
        .join(Desafio, Pontuacao.desafio_id == Desafio.id)
        .join(Treino, Desafio.treino_id == Treino.id)
        .filter(Pontuacao.aluno_nome == nome)
        .order_by(Treino.data.asc())
        .all()
    )
    return [
        EvolucaoItem(data=str(data), desafio=desafio_nome, valor=p.valor)
        for p, desafio_nome, data in rows
    ]
