import { useState, useEffect } from "react";

const FREQ_KEY = "aluno_freq";

function registrarVisita() {
  const hoje = new Date().toISOString().split("T")[0];
  const freq = JSON.parse(localStorage.getItem(FREQ_KEY) || "[]");
  if (!freq.includes(hoje)) {
    freq.push(hoje);
    localStorage.setItem(FREQ_KEY, JSON.stringify(freq));
  }
}

function freqMes() {
  const freq = JSON.parse(localStorage.getItem(FREQ_KEY) || "[]");
  const mes = new Date().toISOString().slice(0, 7); // "2026-05"
  return freq.filter(d => d.startsWith(mes)).length;
}

export function useAluno() {
  const [nome, setNome] = useState(() => localStorage.getItem("aluno_nome") || "");

  useEffect(() => {
    if (nome) registrarVisita();
  }, [nome]);

  function salvar(n) {
    const limpo = n.trim();
    localStorage.setItem("aluno_nome", limpo);
    setNome(limpo);
    registrarVisita();
  }

  function limpar() {
    localStorage.removeItem("aluno_nome");
    setNome("");
  }

  return { nome, salvar, limpar, freqMes };
}
