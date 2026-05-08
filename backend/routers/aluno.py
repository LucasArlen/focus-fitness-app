import hashlib
import hmac
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import ADMIN_PASSWORD, ADMIN_USERNAME, create_token, require_admin
from database import get_db
from models import Aluno, AppConfig
from schemas import AdminLoginIn, AlunoIn, Token

router = APIRouter()


def _hash_pin(pin: str) -> str:
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt.encode(), 100_000).hex()
    return f"{salt}:{key}"


def _verify_pin(pin: str, stored: str) -> bool:
    salt, key = stored.split(":")
    new_key = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt.encode(), 100_000).hex()
    return hmac.compare_digest(key, new_key)


@router.post("/admin/login", response_model=Token)
def admin_login(body: AdminLoginIn):
    if body.username != ADMIN_USERNAME or body.password != ADMIN_PASSWORD:
        raise HTTPException(401, "Credenciais inválidas")
    return Token(access_token=create_token({"sub": "admin", "role": "admin"}), role="admin")


@router.post("/aluno/cadastro", response_model=Token)
def cadastrar_aluno(body: AlunoIn, db: Session = Depends(get_db)):
    # Valida código de convite (só para novos cadastros)
    cfg = db.query(AppConfig).filter(AppConfig.key == "invite_code").first()
    if cfg and body.invite_code != cfg.value:
        raise HTTPException(403, "Código de convite inválido. Escaneie o QR code da academia.")

    aluno_existente = db.query(Aluno).filter(Aluno.nome == body.nome).first()
    if aluno_existente:
        # Se o convite é válido, permite re-entry em device novo (reseta PIN)
        if cfg and body.invite_code == cfg.value:
            aluno_existente.pin_hash = _hash_pin(body.pin)
            db.commit()
            db.refresh(aluno_existente)
            return Token(
                access_token=create_token({"sub": str(aluno_existente.id), "role": "aluno", "nome": aluno_existente.nome}),
                role="aluno",
            )
        raise HTTPException(400, "Nome já cadastrado")
    aluno = Aluno(nome=body.nome, pin_hash=_hash_pin(body.pin))
    db.add(aluno)
    db.commit()
    db.refresh(aluno)
    return Token(
        access_token=create_token({"sub": str(aluno.id), "role": "aluno", "nome": aluno.nome}),
        role="aluno",
    )


@router.get("/alunos")
def listar_alunos(page: int = 1, db: Session = Depends(get_db), _=Depends(require_admin)):
    """Admin: lista paginada de todos os alunos."""
    per_page = 20
    total = db.query(Aluno).count()
    alunos = (
        db.query(Aluno)
        .order_by(Aluno.nome)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {
        "alunos": [{"nome": a.nome, "criado_em": a.criado_em.strftime("%d/%m/%Y")} for a in alunos],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // per_page)),  # ceil division
    }


@router.post("/admin/seed")
def seed_alunos(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Cria alunos fictícios para testes (idempotente)."""
    nomes = [
        "Ana Silva", "Bruno Costa", "Carla Santos", "Diego Mendes",
        "Eva Rodrigues", "Felipe Lima", "Gabriela Rocha", "Henrique Alves",
        "Isabela Ferreira", "João Pereira",
    ]
    criados = []
    for nome in nomes:
        if not db.query(Aluno).filter(Aluno.nome == nome).first():
            db.add(Aluno(nome=nome, pin_hash=_hash_pin("1234")))
            criados.append(nome)
    db.commit()
    return {"criados": len(criados), "nomes": criados}


@router.post("/aluno/login", response_model=Token)
def login_aluno(body: AlunoIn, db: Session = Depends(get_db)):
    aluno = db.query(Aluno).filter(Aluno.nome == body.nome).first()
    if not aluno or not _verify_pin(body.pin, aluno.pin_hash):
        raise HTTPException(401, "Nome ou PIN inválido")
    return Token(
        access_token=create_token({"sub": str(aluno.id), "role": "aluno", "nome": aluno.nome}),
        role="aluno",
    )
