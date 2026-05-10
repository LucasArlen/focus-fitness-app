import datetime
from typing import List, Optional
from pydantic import BaseModel


class LinhaIn(BaseModel):
    exercicio: str
    serie: str
    dropset: bool = False
    video_url: Optional[str] = None


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
    data: Optional[datetime.date] = None


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
    presente: Optional[bool] = None
    model_config = {"from_attributes": True}


class ApelidoIn(BaseModel):
    apelido: Optional[str] = None


class RankingMensalItem(BaseModel):
    nome: str
    apelido: Optional[str] = None
    participacoes: int
    total: float
    melhor: float


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


class CredenciaisIn(BaseModel):
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
    apelido: Optional[str] = None
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


class AvisoIn(BaseModel):
    titulo: str
    corpo: Optional[str] = None
    foto: Optional[str] = None
    categoria: str = "aviso"
    data_evento: Optional[str] = None
    expira_em: datetime.date


class ConfirmacaoOut(BaseModel):
    aluno_nome: str
    model_config = {"from_attributes": True}


class AvisoOut(BaseModel):
    id: int
    titulo: str
    corpo: Optional[str] = None
    foto: Optional[str] = None
    categoria: str
    data_evento: Optional[str] = None
    expira_em: datetime.date
    criado_em: datetime.datetime
    confirmacoes: List[ConfirmacaoOut]
    model_config = {"from_attributes": True}
