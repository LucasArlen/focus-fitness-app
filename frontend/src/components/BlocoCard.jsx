import { useEffect, useState } from "react";
import { getReacoes, toggleReacao } from "../api/reacao";

const EMOJIS = ["🔥", "💀", "❤️", "😅", "💪"];

// ── Detecta YouTube, extrai ID e formato ────────────────────────────────────
function parseYouTube(url) {
  if (!url) return null;
  const shorts = /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/.exec(url);
  if (shorts) return { id: shorts[1], vertical: true };
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(url);
  if (m) return { id: m[1], vertical: false };
  return null;
}

// ── Modal de vídeo ───────────────────────────────────────────────────────────
function VideoModal({ url, titulo, onFechar }) {
  const yt = parseYouTube(url);

  return (
    <div className="video-modal-overlay" onClick={onFechar}>
      <div className={`video-modal ${yt?.vertical ? "video-modal-vertical" : ""}`} onClick={e => e.stopPropagation()}>
        <div className="video-modal-header">
          <span className="video-modal-titulo">{titulo}</span>
          <button className="video-modal-fechar" onClick={onFechar}>✕</button>
        </div>

        {yt ? (
          <div className={`video-modal-player ${yt.vertical ? "vertical" : ""}`}>
            <iframe
              src={`https://www.youtube.com/embed/${yt.id}?autoplay=1&rel=0&controls=0&iv_load_policy=3&playsinline=1`}
              title={titulo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="video-modal-externo">
            <span className="video-modal-icon">🎬</span>
            <p className="video-modal-hint">Vídeo em link externo</p>
            <a
              className="video-modal-abrir-btn"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onFechar}
            >
              Abrir vídeo ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Linha individual ─────────────────────────────────────────────────────────
function LinhaItem({ linha, reacao, onToggle }) {
  const [pickerAberto, setPickerAberto] = useState(false);
  const [videoAberto,  setVideoAberto]  = useState(false);
  const pills = Object.entries(reacao.contagens || {}).sort(([, a], [, b]) => b - a);
  const meuEmoji = reacao.meu_emoji;
  const semReacoes = pills.length === 0;

  return (
    <>
      <li className="linha-item" onClick={() => setPickerAberto(v => !v)}>
        <div className="linha-row">
          <span className="exercicio">{linha.exercicio}</span>
          <div className="linha-right">
            {linha.dropset && (
              <span className="dropset-tag" title="Reduza o peso e continue sem pausa">DS</span>
            )}
            <span className="serie">{linha.serie}</span>
            {linha.video_url && (
              <button
                className="linha-video-btn"
                title="Ver demonstração"
                onClick={e => { e.stopPropagation(); setVideoAberto(true); }}
              >
                🎬
              </button>
            )}
            {semReacoes && !linha.video_url && (
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

      {videoAberto && (
        <VideoModal
          url={linha.video_url}
          titulo={linha.exercicio}
          onFechar={() => setVideoAberto(false)}
        />
      )}
    </>
  );
}

// ── BlocoCard ────────────────────────────────────────────────────────────────
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
