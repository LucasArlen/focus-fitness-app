import { apiFetch } from "./client";

// Público — lista quem está presente hoje
export const getPresencas = () => apiFetch("/treino/hoje/presencas");

// Admin — lista todos os membros com flag de presença
export const getChamada = () => apiFetch("/treino/hoje/chamada");

// Admin — marcar / desmarcar aluno específico
export const marcarPresenca   = (nome) => apiFetch(`/treino/hoje/presenca/${encodeURIComponent(nome)}`, { method: "POST" });
export const desmarcarPresenca = (nome) => apiFetch(`/treino/hoje/presenca/${encodeURIComponent(nome)}`, { method: "DELETE" });
