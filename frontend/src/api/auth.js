import { apiFetch } from "./client";

export const adminLogin = (username, password) =>
  apiFetch("/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const alunoLogin = (nome, pin) =>
  apiFetch("/aluno/login", {
    method: "POST",
    body: JSON.stringify({ nome, pin }),
  });

export const alunoCadastro = (nome, pin) =>
  apiFetch("/aluno/cadastro", {
    method: "POST",
    body: JSON.stringify({ nome, pin }),
  });
