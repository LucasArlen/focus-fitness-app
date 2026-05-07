import { apiFetch } from "./client";

export const cadastrarAluno = (nome, pin) =>
  apiFetch("/aluno/cadastro", { method: "POST", body: JSON.stringify({ nome, pin }) });

export const loginAluno = (nome, pin) =>
  apiFetch("/aluno/login", { method: "POST", body: JSON.stringify({ nome, pin }) });
