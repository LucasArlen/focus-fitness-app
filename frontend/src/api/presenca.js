import { apiFetch } from "./client";

export const getPresencas  = ()  => apiFetch("/treino/hoje/presencas");
export const postPresenca  = ()  => apiFetch("/treino/hoje/presenca",  { method: "POST" });
export const deletePresenca = () => apiFetch("/treino/hoje/presenca",  { method: "DELETE" });
