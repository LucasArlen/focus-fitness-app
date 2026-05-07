import { apiFetch } from "./client";

export const getDesafioHoje = () => apiFetch("/desafio/hoje");

export const postPontuacao = (desafioId, aluno_nome, valor) =>
  apiFetch(`/desafio/${desafioId}/pontuacao`, {
    method: "POST",
    body: JSON.stringify({ aluno_nome, valor }),
  });

export const deletePontuacao = (id) =>
  apiFetch(`/pontuacao/${id}`, { method: "DELETE" });

export const fecharDesafio = (desafioId) =>
  apiFetch(`/desafio/${desafioId}/fechar`, { method: "PUT" });
