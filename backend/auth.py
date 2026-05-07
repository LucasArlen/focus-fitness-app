from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SECRET_KEY = "quadro-2025-secret-key"
ALGORITHM = "HS256"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "quadro123"

bearer = HTTPBearer(auto_error=False)


def create_token(data: dict) -> str:
    payload = {**data, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def require_admin(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if not credentials:
        raise HTTPException(401, "Não autorizado")
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("role") != "admin":
            raise HTTPException(401, "Acesso de admin necessário")
        return payload
    except jwt.PyJWTError:
        raise HTTPException(401, "Token inválido")


def require_any(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if not credentials:
        raise HTTPException(401, "Não autorizado")
    try:
        return decode_token(credentials.credentials)
    except jwt.PyJWTError:
        raise HTTPException(401, "Token inválido")
