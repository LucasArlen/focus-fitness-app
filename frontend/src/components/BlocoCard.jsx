import { useEffect, useState } from "react";
import { getReacoes, toggleReacao } from "../api/reacao";

const EMOJIS = ["🔥", "💀", "❤️", "😅", "💪"];

export default function BlocoCard({ bloco }) {
  const [reacoes, setReacoes] = useState({ contagens: {}, meu_emoji: null });

  useEffect(() => {
    getReacoes([bloco.id])
      .then(data => setReacoes(data[String(bloco.id)] ?? { contagens: {}, meu_emoji: null }))
      .catch(() => {});
  }, [bloco.id]);

  async function reagir(emoji) {
    const prev = reacoes;
    const novoMeu = prev.meu_emoji === emoji ? null : emoji;

    // Optimistic update
    setReacoes(() => {
      const conts = { ...prev.contagens };
      if (prev.meu_emoji) {
        conts[prev.meu_emoji] = Math.max(0, (conts[prev.meu_emoji] || 1) - 1);
        if (conts[prev.meu_emoji] === 0) delete conts[prev.meu_emoji];
      }
      if (novoMeu) {
        conts[novoMeu] = (conts[novoMeu] || 0) + 1;
      }
      return { contagens: conts, meu_emoji: novoMeu };
    });

    try {
      await toggleReacao(bloco.id, emoji);
    } catch {
      // revert on error
      getReacoes([bloco.id])
        .then(data => setReacoes(data[String(bloco.id)] ?? { contagens: {}, meu_emoji: null }))
        .catch(() => {});
    }
  }

  return (
    <div className="bloco-card">
      <div className="bloco-header">
        <div className="bloco-accent" />
        <span className="bloco-nome">{bloco.nome}</span>
      </div>

      <ul className="linha-list">
        {bloco.linhas.map(linha => (
          <li key={linha.id} className="linha-item">
            <div className="linha-row">
              <span className="exercicio">{linha.exercicio}</span>
              <div className="linha-right">
                {linha.dropset && <span className="dropset-tag">Drop Set</span>}
                <span className="serie">{linha.serie}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="reaction-bar">
        {EMOJIS.map(emoji => {
          const count = reacoes.contagens[emoji] || 0;
          const minha = reacoes.meu_emoji === emoji;
          return (
            <button
              key={emoji}
              className={`reaction-btn ${minha ? "ativo" : ""}`}
              onClick={() => reagir(emoji)}
            >
              <span className="reaction-emoji">{emoji}</span>
              {count > 0 && <span className="reaction-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
