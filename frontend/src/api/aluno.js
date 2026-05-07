import { apiFetch } from "./client";

export const cadastrarAluno = (nome, pin, invite_code) =>
  apiFetch("/aluno/cadastro", { method: "POST", body: JSON.stringify({ nome, pin, invite_code }) });

export const loginAluno = (nome, pin) =>
  apiFetch("/aluno/login", { method: "POST", body: JSON.stringify({ nome, pin }) });
