import secrets

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import AppConfig

router = APIRouter()


def _get_or_create_code(db: Session) -> str:
    cfg = db.query(AppConfig).filter(AppConfig.key == "invite_code").first()
    if cfg:
        return cfg.value
    code = secrets.token_urlsafe(6)
    db.add(AppConfig(key="invite_code", value=code))
    db.commit()
    return code


@router.get("/invite")
def get_invite(db: Session = Depends(get_db), _=Depends(require_admin)):
    return {"code": _get_or_create_code(db)}


@router.post("/invite/regenerate")
def regenerate_invite(db: Session = Depends(get_db), _=Depends(require_admin)):
    new_code = secrets.token_urlsafe(6)
    cfg = db.query(AppConfig).filter(AppConfig.key == "invite_code").first()
    if cfg:
        cfg.value = new_code
    else:
        db.add(AppConfig(key="invite_code", value=new_code))
    db.commit()
    return {"code": new_code}
