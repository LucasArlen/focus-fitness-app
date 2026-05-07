import { useState } from "react";

const EMOJIS = ["🔥", "💀", "❤️", "😅", "💪"];

function carregarReacoes(blocoId) {
  try { return JSON.parse(localStorage.getItem(`r_${blocoId}`)) || {}; }
  catch { return {}; }
}

function salvarReacoes(blocoId, data) {
  localStorage.setItem(`r_${blocoId}`, JSON.stringify(data));
}

export default function BlocoCard({ bloco }) {
  const [expandida, setExpandida] = useState(null);
  const [reacoes, setReacoes] = useState(() => carregarReacoes(bloco.id));

  function togglePicker(linhaId) {
    setExpandida(prev => prev === linhaId ? null : linhaId);
  }

  function reagir(linhaId, emoji) {
    setReacoes(prev => {
      const atual = prev[linhaId] || {};
      const meu = atual._meu;
      const novo = { ...atual };

      if (meu) {
        novo[meu] = Math.max(0, (novo[meu] || 1) - 1);
        if (novo[meu] === 0) delete novo[meu];
        delete novo._meu;
      }
      if (meu !== emoji) {
        novo[emoji] = (novo[emoji] || 0) + 1;
        novo._meu = emoji;
      }

      const prox = { ...prev, [linhaId]: novo };
      salvarReacoes(bloco.id, prox);
      return prox;
    });
    setExpandida(null);
  }

  return (
    <div className="bloco-card">
      <div className="bloco-header">
        <div className="bloco-accent" />
        <span className="bloco-nome">{bloco.nome}</span>
      </div>

      <ul className="linha-list">
        {bloco.linhas.map(linha => {
          const r = reacoes[linha.id] || {};
          const pills = Object.entries(r).filter(([k]) => k !== "_meu").sort(([, a], [, b]) => b - a);
          const aberta = expandida === linha.id;

          return (
            <li key={linha.id} className="linha-item" onClick={() => togglePicker(linha.id)}>
              <div className="linha-row">
                <span className="exercicio">{linha.exercicio}</span>
                <div className="linha-right">
                  {linha.dropset && <span className="dropset-tag">Drop Set</span>}
                  <span className="serie">{linha.serie}</span>
                </div>
              </div>

              {pills.length > 0 && (
                <div className="reacoes-display" onClick={e => e.stopPropagation()}>
                  {pills.map(([emoji, count]) => (
                    <span key={emoji} className={`reacao-pill ${r._meu === emoji ? "minha" : ""}`}
                      onClick={() => reagir(linha.id, emoji)}>
                      <span className="emoji-val">{emoji}</span>
                      <span className="emoji-count">{count}</span>
                    </span>
                  ))}
                </div>
              )}

              {aberta && (
                <div className="emoji-picker" onClick={e => e.stopPropagation()}>
                  {EMOJIS.map(emoji => (
                    <button key={emoji} className={`emoji-btn ${r._meu === emoji ? "ativo" : ""}`}
                      onClick={() => reagir(linha.id, emoji)}>{emoji}</button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
