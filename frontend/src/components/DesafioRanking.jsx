const MEDALHAS = ["🥇", "🥈", "🥉"];

export default function DesafioRanking({ desafio }) {
  return (
    <div className="bloco-card desafio-card">
      <h2 className="bloco-nome">🏆 Desafio do Dia</h2>
      <p className="desafio-nome">{desafio.nome}</p>
      <ol className="ranking-list">
        {desafio.pontuacoes.map((p, i) => (
          <li key={p.id} className={`ranking-item pos-${i + 1}`}>
            <span className="medalha">{MEDALHAS[i] ?? `${i + 1}º`}</span>
            <span className="ranking-nome">{p.aluno_nome}</span>
            <span className="ranking-valor">{p.valor}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
