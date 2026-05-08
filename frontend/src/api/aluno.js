import { apiFetch } from "./client";

export const cadastrarAluno = (nome, invite_code) =>
  apiFetch("/aluno/cadastro", { method: "POST", body: JSON.stringify({ nome, invite_code }) });
