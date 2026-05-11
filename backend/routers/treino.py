import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import Bloco, Desafio, ExercicioBanco, Linha, Presenca, Treino
from schemas import TreinoIn, TreinoOut, TreinoResumoOut

router = APIRouter()


@router.get("/treino/historico", response_model=list[TreinoResumoOut])
def get_historico(limite: int = 30, aluno: str = "", db: Session = Depends(get_db)):
    treinos = (
        db.query(Treino)
        .filter(Treino.publicado == True)
        .order_by(Treino.data.desc())
        .limit(limite)
        .all()
    )
    result = []
    for t in treinos:
        total_ex = sum(len(b.linhas) for b in t.blocos)
        meu_resultado = None
        presente = None
        if aluno:
            aluno_norm = aluno.strip().lower()
            if t.desafio:
                pontuacao = next(
                    (p for p in t.desafio.pontuacoes
                     if p.aluno_nome.strip().lower() == aluno_norm),
                    None
                )
                if pontuacao:
                    meu_resultado = pontuacao.valor
            p = db.query(Presenca).filter(
                Presenca.treino_id == t.id,
                Presenca.aluno_nome.ilike(aluno)
            ).first()
            presente = p is not None
        result.append(TreinoResumoOut(
            id=t.id,
            data=t.data,
            total_blocos=len(t.blocos),
            total_exercicios=total_ex,
            nomes_blocos=[b.nome for b in t.blocos],
            desafio_nome=t.desafio.nome if t.desafio else None,
            meu_resultado=meu_resultado,
            presente=presente,
        ))
    return result


@router.get("/treino/semana")
def get_semana(db: Session = Depends(get_db), _=Depends(require_admin), data: str = None):
    if data:
        try:
            hoje = datetime.date.fromisoformat(data)
        except ValueError:
            hoje = datetime.date.today()
    else:
        hoje = datetime.date.today()
    segunda = hoje - datetime.timedelta(days=hoje.weekday())
    dias = [segunda + datetime.timedelta(days=i) for i in range(7)]
    treinos = db.query(Treino).filter(Treino.data.in_(dias)).all()
    mapa = {t.data: t for t in treinos}
    return [
        {
            "data": d.isoformat(),
            "tem_treino": d in mapa,
            "total_blocos": len(mapa[d].blocos) if d in mapa else 0,
            "eh_hoje": d == hoje,
        }
        for d in dias
    ]


@router.get("/treino/data/{data_str}", response_model=TreinoOut)
def get_treino_por_data(data_str: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    try:
        data = datetime.date.fromisoformat(data_str)
    except ValueError:
        raise HTTPException(400, "Data inválida")
    treino = db.query(Treino).filter(Treino.data == data).first()
    if not treino:
        raise HTTPException(404, "Sem treino nesta data")
    return treino


@router.get("/treino/ultimo", response_model=TreinoOut)
def get_treino_ultimo(db: Session = Depends(get_db)):
    treino = (
        db.query(Treino)
        .filter(Treino.publicado == True)
        .order_by(Treino.data.desc())
        .first()
    )
    if not treino:
        raise HTTPException(404, "Nenhum treino publicado")
    return treino


@router.get("/treino/hoje", response_model=TreinoOut)
def get_treino_hoje(db: Session = Depends(get_db)):
    treino = db.query(Treino).filter(Treino.data == datetime.date.today()).first()
    if not treino:
        raise HTTPException(404, "Nenhum treino para hoje")
    return treino


@router.get("/treino/{treino_id}", response_model=TreinoOut)
def get_treino(treino_id: int, db: Session = Depends(get_db)):
    treino = db.get(Treino, treino_id)
    if not treino:
        raise HTTPException(404, "Treino não encontrado")
    return treino


@router.post("/treino", response_model=TreinoOut)
def create_treino(body: TreinoIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    hoje = datetime.date.today()
    data_treino = body.data or hoje

    existente = db.query(Treino).filter(Treino.data == data_treino).first()
    if existente:
        db.delete(existente)
        db.commit()

    treino = Treino(data=data_treino, publicado=True)
    db.add(treino)
    db.flush()

    for i, b in enumerate(body.blocos):
        bloco = Bloco(treino_id=treino.id, nome=b.nome, ordem=i, sugestao=b.sugestao)
        db.add(bloco)
        db.flush()
        for l in b.linhas:
            db.add(Linha(bloco_id=bloco.id, exercicio=l.exercicio, serie=l.serie, dropset=l.dropset, video_url=l.video_url or None))
            # Auto-populate banco de exercícios
            nome = l.exercicio.strip()
            if nome and not db.query(ExercicioBanco).filter(ExercicioBanco.nome == nome).first():
                db.add(ExercicioBanco(nome=nome))

    if body.desafio_nome:
        db.add(Desafio(treino_id=treino.id, nome=body.desafio_nome, fechado=False))

    db.commit()
    db.refresh(treino)

    # Push notification só para treinos de hoje
    if data_treino == hoje:
        try:
            from routers.push import send_push_to_all
            send_push_to_all(
                db,
                title="Treino publicado! 💪",
                body="O treino de hoje está disponível. Bora treinar!",
            )
        except Exception:
            pass

    return treino
