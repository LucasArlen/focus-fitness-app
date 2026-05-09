import { apiFetch } from "./client";

export const getTreinoHoje  = () => apiFetch("/treino/hoje");
export const getTreinoUltimo = () => apiFetch("/treino/ultimo");

export const postTreino = (body) =>
  apiFetch("/treino", { method: "POST", body: JSON.stringify(body) });
