from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import ADMIN_PASSWORD, ADMIN_USERNAME, create_token, require_admin, require_any
from database import get_db
from models import Aluno, AppConfig, Bloco, Desafio, Linha, Pontuacao, Presenca, PushSubscription, Reacao, Treino
from schemas import AdminLoginIn, AlunoIn, CredenciaisIn, Token, PerfilOut, PerfilIn

router = APIRouter()


def _get_credenciais(db: Session):
    u = db.query(AppConfig).filter(AppConfig.key == "admin_username").first()
    p = db.query(AppConfig).filter(AppConfig.key == "admin_password").first()
    return (u.value if u else ADMIN_USERNAME), (p.value if p else ADMIN_PASSWORD)


@router.post("/admin/login", response_model=Token)
def admin_login(body: AdminLoginIn, db: Session = Depends(get_db)):
    username, password = _get_credenciais(db)
    if body.username != username or body.password != password:
        raise HTTPException(401, "Credenciais inválidas")
    return Token(access_token=create_token({"sub": "admin", "role": "admin"}), role="admin")


@router.put("/admin/credenciais")
def alterar_credenciais(body: CredenciaisIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    if not body.username.strip() or not body.password.strip():
        raise HTTPException(400, "Usuário e senha não podem ser vazios")
    for key, val in [("admin_username", body.username.strip()), ("admin_password", body.password.strip())]:
        cfg = db.query(AppConfig).filter(AppConfig.key == key).first()
        if cfg:
            cfg.value = val
        else:
            db.add(AppConfig(key=key, value=val))
    db.commit()
    return {"ok": True}


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


@router.post("/admin/reset")
def reset_dados(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Admin: apaga todos os dados gerados (treinos, alunos, presenças, push). Mantém config."""
    for model in [Presenca, PushSubscription, Pontuacao, Desafio, Reacao, Linha, Bloco, Treino, Aluno]:
        db.query(model).delete(synchronize_session=False)
    db.commit()
    return {"ok": True}


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
