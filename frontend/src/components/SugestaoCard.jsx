import { useState } from "react";
import ReactionBar from "./ReactionBar";

export default function SugestaoCard({ bloco }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="bloco-card sugestao-card">
      <button className="sugestao-toggle" onClick={() => setAberto(p => !p)}>
        <span className="bloco-nome">{bloco.nome}</span>
        <span className="sugestao-chevron">{aberto ? "▲" : "▼"}</span>
      </button>

      {aberto && (
        <>
          <ul className="linha-list">
            {bloco.linhas.map(linha => (
              <li key={linha.id} className="linha-item">
                <span className="exercicio">{linha.exercicio}</span>
                <span className="serie">{linha.serie}</span>
                {linha.dropset && <span className="dropset-badge">DS</span>}
              </li>
            ))}
          </ul>
          <ReactionBar blocoId={bloco.id} />
        </>
      )}
    </div>
  );
}
