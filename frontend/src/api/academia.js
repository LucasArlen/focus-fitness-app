import { apiFetch } from "./client";

export const getStatus = ()     => apiFetch("/academia/status");
export const putStatus = (body) => apiFetch("/academia/status", { method: "PUT", body: JSON.stringify(body) });
