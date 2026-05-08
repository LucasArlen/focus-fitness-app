import datetime
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from database import Base


class Treino(Base):
    __tablename__ = "treinos"
    id = Column(Integer, primary_key=True, index=True)
    data = Column(Date, unique=True, index=True)
    publicado = Column(Boolean, default=False)
    blocos = relationship("Bloco", back_populates="treino", cascade="all, delete-orphan", order_by="Bloco.ordem")
    desafio = relationship("Desafio", back_populates="treino", uselist=False, cascade="all, delete-orphan")


class Bloco(Base):
    __tablename__ = "blocos"
    id = Column(Integer, primary_key=True, index=True)
    treino_id = Column(Integer, ForeignKey("treinos.id"))
    nome = Column(Text)
    ordem = Column(Integer, default=0)
    sugestao = Column(Boolean, default=False)
    treino = relationship("Treino", back_populates="blocos")
    linhas = relationship("Linha", back_populates="bloco", cascade="all, delete-orphan")


class Linha(Base):
    __tablename__ = "linhas"
    id = Column(Integer, primary_key=True, index=True)
    bloco_id = Column(Integer, ForeignKey("blocos.id"))
    exercicio = Column(Text)
    serie = Column(Text)
    dropset = Column(Boolean, default=False)
    bloco = relationship("Bloco", back_populates="linhas")


class Desafio(Base):
    __tablename__ = "desafios"
    id = Column(Integer, primary_key=True, index=True)
    treino_id = Column(Integer, ForeignKey("treinos.id"))
    nome = Column(Text)
    fechado = Column(Boolean, default=False)
    treino = relationship("Treino", back_populates="desafio")
    pontuacoes = relationship("Pontuacao", back_populates="desafio", cascade="all, delete-orphan", order_by="Pontuacao.ordem")


class Pontuacao(Base):
    __tablename__ = "pontuacoes"
    id = Column(Integer, primary_key=True, index=True)
    desafio_id = Column(Integer, ForeignKey("desafios.id"))
    aluno_nome = Column(Text)
    valor = Column(Text)
    ordem = Column(Integer, default=0)
    desafio = relationship("Desafio", back_populates="pontuacoes")


class Aluno(Base):
    __tablename__ = "alunos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(Text, unique=True)
    pin_hash = Column(Text, nullable=True)  # legado — não utilizado
    apelido = Column(Text, nullable=True)
    foto    = Column(Text, nullable=True)   # base64 JPEG compressed
    criado_em = Column(DateTime, default=datetime.datetime.utcnow)
    reacoes = relationship("Reacao", back_populates="aluno", cascade="all, delete-orphan")


class Reacao(Base):
    __tablename__ = "reacoes"
    id = Column(Integer, primary_key=True, index=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id"))
    linha_id = Column(Integer, ForeignKey("linhas.id"), nullable=True)
    emoji = Column(Text)
    aluno = relationship("Aluno", back_populates="reacoes")


class ExercicioBanco(Base):
    __tablename__ = "exercicios_banco"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(Text, unique=True, index=True)


class Presenca(Base):
    __tablename__ = "presencas"
    id         = Column(Integer, primary_key=True, index=True)
    treino_id  = Column(Integer, ForeignKey("treinos.id"))
    aluno_nome = Column(Text)
    criado_em  = Column(DateTime, default=datetime.datetime.utcnow)


class AcademiaStatus(Base):
    __tablename__ = "academia_status"
    id      = Column(Integer, primary_key=True, default=1)
    ativo   = Column(Boolean, default=False)
    status  = Column(Text, default="fechado")  # fechado | vazio | tranquilo | cheio | lotado


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id        = Column(Integer, primary_key=True, index=True)
    endpoint  = Column(Text, unique=True, index=True)
    p256dh    = Column(Text)
    auth      = Column(Text)
    criado_em = Column(DateTime, default=datetime.datetime.utcnow)


class AppConfig(Base):
    __tablename__ = "app_config"
    id    = Column(Integer, primary_key=True, index=True)
    key   = Column(Text, unique=True, index=True)
    value = Column(Text)


class Aviso(Base):
    __tablename__ = "avisos"
    id          = Column(Integer, primary_key=True, index=True)
    titulo      = Column(Text)
    corpo       = Column(Text, nullable=True)
    foto        = Column(Text, nullable=True)   # base64
    categoria   = Column(Text, default="aviso") # aviso | evento | feriado
    data_evento = Column(Text, nullable=True)   # texto livre, e.g. "Sábado 17/05 às 10h"
    expira_em   = Column(Date)
    criado_em   = Column(DateTime, default=datetime.datetime.utcnow)
    confirmacoes = relationship("Confirmacao", back_populates="aviso", cascade="all, delete-orphan")


class Confirmacao(Base):
    __tablename__ = "confirmacoes"
    id        = Column(Integer, primary_key=True, index=True)
    aviso_id  = Column(Integer, ForeignKey("avisos.id"))
    aluno_nome = Column(Text)
    aviso     = relationship("Aviso", back_populates="confirmacoes")
