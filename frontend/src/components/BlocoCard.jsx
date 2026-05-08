import { useEffect, useState } from "react";
import { getReacoes, toggleReacao } from "../api/reacao";

const EMOJIS = ["🔥", "💀", "❤️", "😅", "💪"];

function LinhaItem({ linha, reacao, onToggle }) {
  const [pickerAberto, setPickerAberto] = useState(false);
  const pills = Object.entries(reacao.contagens || {}).sort(([, a], [, b]) => b - a);
  const meuEmoji = reacao.meu_emoji;
  const semReacoes = pills.length === 0;

  return (
    <li className="linha-item" onClick={() => setPickerAberto(v => !v)}>
      <div className="linha-row">
        <span className="exercicio">{linha.exercicio}</span>
        <div className="linha-right">
          {linha.dropset && (
            <span className="dropset-tag" title="Reduza o peso e continue sem pausa">DS</span>
          )}
          <span className="serie">{linha.serie}</span>
          {semReacoes && (
            <span className="reacao-hint" title="Toque para reagir">😀</span>
          )}
        </div>
      </div>

      {pills.length > 0 && (
        <div className="reacoes-display" onClick={e => e.stopPropagation()}>
          {pills.map(([emoji, count]) => (
            <span
              key={emoji}
              className={`reacao-pill ${meuEmoji === emoji ? "minha" : ""}`}
              onClick={() => onToggle(emoji)}
            >
              <span className="emoji-val">{emoji}</span>
              <span className="emoji-count">{count}</span>
            </span>
          ))}
        </div>
      )}

      {pickerAberto && (
        <div className="emoji-picker" onClick={e => e.stopPropagation()}>
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              className={`emoji-btn ${meuEmoji === emoji ? "ativo" : ""}`}
              onClick={() => { onToggle(emoji); setPickerAberto(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

export default function BlocoCard({ bloco }) {
  const linhaIds = bloco.linhas.map(l => l.id);
  const [reacoes, setReacoes] = useState({});

  useEffect(() => {
    if (linhaIds.length === 0) return;
    getReacoes(linhaIds)
      .then(data => setReacoes(data))
      .catch(() => {});
  }, [bloco.id]);

  async function handleToggle(linhaId, emoji) {
    const prev = reacoes[String(linhaId)] || { contagens: {}, meu_emoji: null };
    const novoMeu = prev.meu_emoji === emoji ? null : emoji;

    // Update otimista
    setReacoes(r => {
      const conts = { ...prev.contagens };
      if (prev.meu_emoji) {
        conts[prev.meu_emoji] = Math.max(0, (conts[prev.meu_emoji] || 1) - 1);
        if (conts[prev.meu_emoji] === 0) delete conts[prev.meu_emoji];
      }
      if (novoMeu) conts[novoMeu] = (conts[novoMeu] || 0) + 1;
      return { ...r, [String(linhaId)]: { contagens: conts, meu_emoji: novoMeu } };
    });

    try {
      await toggleReacao(linhaId, emoji);
    } catch {
      // Reverte se falhar
      getReacoes(linhaIds).then(setReacoes).catch(() => {});
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
          <LinhaItem
            key={linha.id}
            linha={linha}
            reacao={reacoes[String(linha.id)] || { contagens: {}, meu_emoji: null }}
            onToggle={emoji => handleToggle(linha.id, emoji)}
          />
        ))}
      </ul>
    </div>
  );
}
