import { useState, useEffect } from "react";

const FREQ_KEY  = "aluno_freq";
const NOME_KEY  = "aluno_nome";
const TOKEN_KEY = "aluno_token";

function registrarVisita() {
  const hoje = new Date().toISOString().split("T")[0];
  const freq = JSON.parse(localStorage.getItem(FREQ_KEY) || "[]");
  if (!freq.includes(hoje)) {
    freq.push(hoje);
    localStorage.setItem(FREQ_KEY, JSON.stringify(freq));
  }
}

export function freqMes() {
  const freq = JSON.parse(localStorage.getItem(FREQ_KEY) || "[]");
  const mes = new Date().toISOString().slice(0, 7);
  return freq.filter(d => d.startsWith(mes)).length;
}

export function useAluno() {
  const [nome, setNome] = useState(() => localStorage.getItem(NOME_KEY) || "");

  useEffect(() => {
    if (nome) registrarVisita();
  }, [nome]);

  function salvar(novoNome, token) {
    localStorage.setItem(NOME_KEY, novoNome);
    if (token) localStorage.setItem(TOKEN_KEY, token);
    setNome(novoNome);
    registrarVisita();
  }

  function limpar() {
    localStorage.removeItem(NOME_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setNome("");
  }

  return { nome, salvar, limpar };
}
