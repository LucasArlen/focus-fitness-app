from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

import os

# Em produção o Railway monta um volume em /data — dados persistem entre deploys.
# Em desenvolvimento usa o diretório local normalmente.
_DB_DIR = "/data" if os.path.isdir("/data") else "."
os.makedirs(_DB_DIR, exist_ok=True)

engine = create_engine(
    f"sqlite:///{_DB_DIR}/quadro.db",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
