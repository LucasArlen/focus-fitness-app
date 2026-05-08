from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import ADMIN_PASSWORD, ADMIN_USERNAME, create_token, require_admin, require_any
from database import get_db
from models import Aluno, AppConfig
from schemas import AdminLoginIn, AlunoIn, Token, PerfilOut, PerfilIn

router = APIRouter()


@router.post("/admin/login", response_model=Token)
def admin_login(body: AdminLoginIn):
    if body.username != ADMIN_USERNAME or body.password != ADMIN_PASSWORD:
        raise HTTPException(401, "Credenciais inválidas")
    return Token(access_token=create_token({"sub": "admin", "role": "admin"}), role="admin")


@router.post("/aluno/cadastro", response_model=Token)
def cadastrar_aluno(body: AlunoIn, db: Session = Depends(get_db)):
    """Cadastra ou re-entra com código de convite válido. Sem PIN."""
    cfg = db.query(AppConfig).filter(AppConfig.key == "invite_code").first()
    if cfg and body.invite_code != cfg.value:
        raise HTTPException(403, "Código de convite inválido. Escaneie o QR code da academia.")

    aluno = db.query(Aluno).filter(Aluno.nome == body.nome).first()
    if not aluno:
        # Novo cadastro
        aluno = Aluno(nome=body.nome, pin_hash=None)
        db.add(aluno)
        db.commit()
        db.refresh(aluno)

    # Aluno existente com convite válido → re-entrada (novo device ou token expirado)
    return Token(
        access_token=create_token({"sub": str(aluno.id), "role": "aluno", "nome": aluno.nome}),
        role="aluno",
    )


@router.get("/aluno/perfil", response_model=PerfilOut)
def get_perfil(db: Session = Depends(get_db), user=Depends(require_any)):
    if user.get("role") != "aluno":
        raise HTTPException(403, "Apenas alunos têm perfil")
    aluno = db.get(Aluno, int(user["sub"]))
    if not aluno:
        raise HTTPException(404, "Aluno não encontrado")
    return aluno


@router.patch("/aluno/perfil")
def update_perfil(body: PerfilIn, db: Session = Depends(get_db), user=Depends(require_any)):
    if user.get("role") != "aluno":
        raise HTTPException(403, "Apenas alunos têm perfil")
    aluno = db.get(Aluno, int(user["sub"]))
    if not aluno:
        raise HTTPException(404, "Aluno não encontrado")
    if body.apelido is not None:
        aluno.apelido = body.apelido.strip() or None
    if body.foto is not None:
        aluno.foto = body.foto or None
    db.commit()
    return {"ok": True}


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
        "pages": max(1, -(-total // per_page)),
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
            db.add(Aluno(nome=nome, pin_hash=None))
            criados.append(nome)
    db.commit()
    return {"criados": len(criados), "nomes": criados}
