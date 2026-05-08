const MEDALHAS = ["🥇", "🥈", "🥉"];

export default function DesafioRanking({ desafio, nomeAluno }) {
  const ranking = [...desafio.pontuacoes]
    .sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0));

  const euSou = (nome) =>
    nomeAluno && nome.trim().toLowerCase() === nomeAluno.trim().toLowerCase();

  return (
    <div className="bloco-card desafio-card">
      <div className="bloco-header">
        <div className="bloco-accent" />
        <span className="bloco-nome">🏆 Desafio do Dia</span>
        {desafio.fechado && (
          <span className="status-badge publicado" style={{ marginLeft: "auto" }}>Finalizado</span>
        )}
      </div>
      <p className="desafio-nome" style={{ paddingTop: 14 }}>{desafio.nome}</p>
      <ol className="ranking-list">
        {ranking.map((p, i) => (
          <li key={p.id} className={`ranking-item pos-${i + 1} ${euSou(p.aluno_nome) ? "minha-linha" : ""}`}>
            <span className="medalha">{MEDALHAS[i] ?? `${i + 1}º`}</span>
            <span className="ranking-nome">
              {p.aluno_nome}
              {euSou(p.aluno_nome) && <span className="ranking-eu-tag"> você</span>}
            </span>
            <span className="ranking-valor">{p.valor} reps</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
