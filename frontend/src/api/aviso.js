import { apiFetch } from "./client";

export const getAvisos = () => apiFetch("/avisos");

export const criarAviso = (body) =>
  apiFetch("/avisos", { method: "POST", body: JSON.stringify(body) });

export const deletarAviso = (id) =>
  apiFetch(`/avisos/${id}`, { method: "DELETE" });

export const confirmarAviso = (id) =>
  apiFetch(`/avisos/${id}/confirmar`, { method: "POST" });
