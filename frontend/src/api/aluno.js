import { apiFetch } from "./client";

export const cadastrarAluno = (nome, invite_code) =>
  apiFetch("/aluno/cadastro", { method: "POST", body: JSON.stringify({ nome, invite_code }) });

export const getPerfil = () =>
  apiFetch("/aluno/perfil");

export const updatePerfil = (body) =>
  apiFetch("/aluno/perfil", { method: "PATCH", body: JSON.stringify(body) });
