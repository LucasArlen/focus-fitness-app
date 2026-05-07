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
    pin_hash = Column(Text)
    criado_em = Column(DateTime, default=datetime.datetime.utcnow)
    reacoes = relationship("Reacao", back_populates="aluno", cascade="all, delete-orphan")


class Reacao(Base):
    __tablename__ = "reacoes"
    id = Column(Integer, primary_key=True, index=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id"))
    bloco_id = Column(Integer, ForeignKey("blocos.id"))
    emoji = Column(Text)
    aluno = relationship("Aluno", back_populates="reacoes")


class ExercicioBanco(Base):
    __tablename__ = "exercicios_banco"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(Text, unique=True, index=True)


class AcademiaStatus(Base):
    __tablename__ = "academia_status"
    id      = Column(Integer, primary_key=True, default=1)
    ativo   = Column(Boolean, default=False)
    status  = Column(Text, default="fechado")  # fechado | vazio | tranquilo | cheio | lotado
