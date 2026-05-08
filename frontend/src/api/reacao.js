import { apiFetch } from "./client";

export const getReacoes = (linhaIds) =>
  apiFetch(`/reacao?linha_ids=${linhaIds.join(",")}`);

export const toggleReacao = (linhaId, emoji) =>
  apiFetch("/reacao", {
    method: "POST",
    body: JSON.stringify({ linha_id: linhaId, emoji }),
  });
