import { apiFetch } from "./client";

export const getTreinoHoje    = ()     => apiFetch("/treino/hoje");
export const getTreinoUltimo  = ()     => apiFetch("/treino/ultimo");
export const getTreinoPorData = (data) => apiFetch(`/treino/data/${data}`);
export const getSemana        = ()     => apiFetch("/treino/semana");

export const postTreino = (body) =>
  apiFetch("/treino", { method: "POST", body: JSON.stringify(body) });
