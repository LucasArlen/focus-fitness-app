import datetime
from typing import List, Optional
from pydantic import BaseModel


class LinhaIn(BaseModel):
    exercicio: str
    serie: str
    dropset: bool = False


class LinhaOut(LinhaIn):
    id: int
    model_config = {"from_attributes": True}


class BlocoIn(BaseModel):
    nome: str
    sugestao: bool = False
    linhas: List[LinhaIn] = []


class BlocoOut(BaseModel):
    id: int
    nome: str
    ordem: int
    sugestao: bool
    linhas: List[LinhaOut]
    model_config = {"from_attributes": True}


class PontuacaoOut(BaseModel):
    id: int
    aluno_nome: str
    valor: str
    ordem: int
    model_config = {"from_attributes": True}


class DesafioOut(BaseModel):
    id: int
    nome: str
    fechado: bool
    pontuacoes: List[PontuacaoOut]
    model_config = {"from_attributes": True}


class TreinoIn(BaseModel):
    blocos: List[BlocoIn] = []
    desafio_nome: Optional[str] = ""


class TreinoOut(BaseModel):
    id: int
    data: datetime.date
    publicado: bool
    blocos: List[BlocoOut]
    desafio: Optional[DesafioOut]
    model_config = {"from_attributes": True}


class TreinoResumoOut(BaseModel):
    id: int
    data: datetime.date
    total_blocos: int
    total_exercicios: int
    nomes_blocos: List[str]
    desafio_nome: Optional[str] = None
    meu_resultado: Optional[str] = None
    model_config = {"from_attributes": True}


class StatusOut(BaseModel):
    ativo: bool
    status: str
    model_config = {"from_attributes": True}


class StatusIn(BaseModel):
    ativo: bool
    status: str


class PontuacaoIn(BaseModel):
    aluno_nome: str
    valor: str


class AlunoIn(BaseModel):
    nome: str
    invite_code: Optional[str] = None


class AdminLoginIn(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class ExercicioOut(BaseModel):
    id: int
    nome: str
    model_config = {"from_attributes": True}


class RankingAnualItem(BaseModel):
    nome: str
    participacoes: int
    total: float
    melhor: float


class EvolucaoItem(BaseModel):
    data: str
    desafio: str
    valor: str


class PerfilOut(BaseModel):
    nome: str
    apelido: Optional[str] = None
    foto: Optional[str] = None
    model_config = {"from_attributes": True}


class PerfilIn(BaseModel):
    apelido: Optional[str] = None
    foto: Optional[str] = None
