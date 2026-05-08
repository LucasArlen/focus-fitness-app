import { useState } from "react";

export default function SugestaoCard({ bloco }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="bloco-card sugestao-card">
      <button className="sugestao-toggle" onClick={() => setAberto(p => !p)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="bloco-accent" />
          <span className="bloco-nome">{bloco.nome}</span>
          <span className="opcional-tag">Opcional</span>
        </div>
        <span className={`sugestao-chevron ${aberto ? "aberto" : ""}`}>▼</span>
      </button>

      {aberto && (
        <ul className="linha-list" style={{ borderTop: "1px solid var(--border)" }}>
          {bloco.linhas.map(linha => (
            <li key={linha.id} className="linha-item" style={{ cursor: "default" }}>
              <div className="linha-row">
                <span className="exercicio">{linha.exercicio}</span>
                <div className="linha-right">
                  {linha.dropset && <span className="dropset-tag" title="Reduza o peso e continue sem pausa">DS</span>}
                  <span className="serie">{linha.serie}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
