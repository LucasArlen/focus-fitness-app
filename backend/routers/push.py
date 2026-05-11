import json
import os

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import AppConfig, PushSubscription

router = APIRouter()

VAPID_EMAIL = os.getenv("VAPID_EMAIL", "mailto:admin@focusfitness.app")


# ── VAPID key management ─────────────────────────────────────────────────────

def _generate_vapid_keys():
    """Generate ECDH P-256 key pair for VAPID, return (private_pem, public_b64)."""
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives import serialization
    import base64

    private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    public_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    public_b64 = base64.urlsafe_b64encode(public_bytes).rstrip(b"=").decode("utf-8")

    return private_pem, public_b64


def get_vapid_keys(db: Session):
    """Return (private_pem, public_b64), generating and persisting if absent."""
    priv_row = db.query(AppConfig).filter(AppConfig.key == "vapid_private").first()
    pub_row  = db.query(AppConfig).filter(AppConfig.key == "vapid_public").first()

    if priv_row and pub_row:
        return priv_row.value, pub_row.value

    private_pem, public_b64 = _generate_vapid_keys()
    db.add(AppConfig(key="vapid_private", value=private_pem))
    db.add(AppConfig(key="vapid_public",  value=public_b64))
    db.commit()
    return private_pem, public_b64


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/push/vapid-key")
def vapid_key(db: Session = Depends(get_db)):
    _, public_key = get_vapid_keys(db)
    return {"publicKey": public_key}


class SubscriptionIn(BaseModel):
    endpoint: str
    keys: dict  # {"p256dh": "...", "auth": "..."}


@router.post("/push/subscribe", status_code=204)
def subscribe(body: SubscriptionIn, db: Session = Depends(get_db)):
    p256dh = body.keys.get("p256dh", "")
    auth   = body.keys.get("auth", "")

    existing = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == body.endpoint)
        .first()
    )
    if existing:
        existing.p256dh = p256dh
        existing.auth   = auth
    else:
        db.add(PushSubscription(endpoint=body.endpoint, p256dh=p256dh, auth=auth))
    db.commit()


@router.delete("/push/unsubscribe", status_code=204)
def unsubscribe(body: SubscriptionIn, db: Session = Depends(get_db)):
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == body.endpoint
    ).delete()
    db.commit()


# ── Helper called by treino router ───────────────────────────────────────────

def send_push_to_all(db: Session, title: str, body: str, tag: str = "notif"):
    """Fire-and-forget push to every subscriber. Removes stale endpoints."""
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        return  # library not installed

    try:
        private_key, _ = get_vapid_keys(db)
    except Exception:
        return

    subs = db.query(PushSubscription).all()
    stale = []

    for sub in subs:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=json.dumps({"title": title, "body": body, "tag": tag}),
                vapid_private_key=private_key,
                vapid_claims={"sub": VAPID_EMAIL},
            )
        except WebPushException as ex:
            if ex.response and ex.response.status_code in (404, 410):
                stale.append(sub.endpoint)
        except Exception:
            pass

    for ep in stale:
        db.query(PushSubscription).filter(PushSubscription.endpoint == ep).delete()
    if stale:
        db.commit()
