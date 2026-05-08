import { apiFetch } from "./client";

export const getReacoes = (blocoIds) =>
  apiFetch(`/reacao?bloco_ids=${blocoIds.join(",")}`);

export const toggleReacao = (blocoId, emoji) =>
  apiFetch("/reacao", {
    method: "POST",
    body: JSON.stringify({ bloco_id: blocoId, emoji }),
  });
