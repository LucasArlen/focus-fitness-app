import { apiFetch } from "./client";

export const getBanco = () => apiFetch("/banco/exercicios");
