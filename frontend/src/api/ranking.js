import { apiFetch } from "./client";

export const getRankingAnual  = ()     => apiFetch("/ranking/anual");
export const getEvolucaoAluno = (nome) => apiFetch(`/ranking/aluno/${encodeURIComponent(nome)}`);
export const getHistorico     = ()     => apiFetch("/treino/historico");
export const getTreino        = (id)   => apiFetch(`/treino/${id}`);
