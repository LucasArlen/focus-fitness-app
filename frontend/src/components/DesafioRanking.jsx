const MEDALHAS = ["🥇", "🥈", "🥉"];

export default function DesafioRanking({ desafio }) {
  const ranking = [...desafio.pontuacoes]
    .sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0));

  return (
    <div className="bloco-card desafio-card">
      <div className="bloco-header">
        <div className="bloco-accent" />
        <span className="bloco-nome">🏆 Desafio do Dia</span>
      </div>
      <p className="desafio-nome" style={{ paddingTop: 14 }}>{desafio.nome}</p>
      <ol className="ranking-list">
        {ranking.map((p, i) => (
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
