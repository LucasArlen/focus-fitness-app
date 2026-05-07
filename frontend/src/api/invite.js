import { apiFetch } from "./client";

export const getInvite     = ()  => apiFetch("/invite");
export const regenerarConvite = () => apiFetch("/invite/regenerate", { method: "POST" });
