import ReactionBar from "./ReactionBar";

export default function BlocoCard({ bloco }) {
  return (
    <div className="bloco-card">
      <h2 className="bloco-nome">{bloco.nome}</h2>
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
    </div>
  );
}
