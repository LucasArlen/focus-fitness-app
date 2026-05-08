import { apiFetch } from "./client";

export const getRankingMensal = (mes = "")  => apiFetch(`/ranking/mensal${mes ? `?mes=${mes}` : ""}`);
export const getEvolucaoAluno = (nome)      => apiFetch(`/ranking/aluno/${encodeURIComponent(nome)}`);
export const getHistorico     = (aluno = "") =>
  apiFetch(`/treino/historico${aluno ? `?aluno=${encodeURIComponent(aluno)}` : ""}`);
export const getTreino        = (id)        => apiFetch(`/treino/${id}`);
