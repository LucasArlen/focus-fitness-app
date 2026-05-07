import { useEffect, useRef, useState } from "react";
import { deletePontuacao, fecharDesafio, getDesafioHoje, postPontuacao } from "../api/desafio";

const MEDALHAS = ["🥇", "🥈", "🥉"];
const numVal = v => parseFloat(v) || 0;

export default function AdminDesafio({ isAdmin }) {
  const [desafio, setDesafio] = useState(null);
  const [estado, setEstado] = useState("carregando");
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const nomeRef = useRef(null);

  function carregar() {
    getDesafioHoje()
      .then(d => { setDesafio(d); setEstado("ok"); })
      .catch(err => setEstado(err.message.includes("404") ? "vazio" : "erro"));
  }

  useEffect(() => { carregar(); }, []);

  const ranking = desafio
    ? [...desafio.pontuacoes].sort((a, b) => numVal(b.valor) - numVal(a.valor))
    : [];

  async function adicionar(e) {
    e.preventDefault();
    if (!novoNome.trim() || !novoValor.trim()) return;
    setSalvando(true);
    try {
      await postPontuacao(desafio.id, novoNome.trim(), novoValor.trim());
      setNovoNome("");
      setNovoValor("");
      carregar();
      nomeRef.current?.focus();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id) {
    await deletePontuacao(id).catch(err => alert(err.message));
    carregar();
  }

  async function fechar() {
    await fecharDesafio(desafio.id).catch(err => alert(err.message));
    carregar();
  }

  return (
    <div className="page">
      <header className="app-header">
        <span className="logo">Quadro.</span>
        {isAdmin && <span className="admin-badge">Desafio</span>}
      </header>

      <main className="feed">
        {estado === "carregando" && <p className="estado-msg">Carregando desafio...</p>}

        {estado === "vazio" && (
          <div className="estado-vazio">
            <p>Nenhum desafio publicado hoje.</p>
            <p className="estado-hint">Publique um treino com desafio na aba Admin.</p>
          </div>
        )}

        {estado === "erro" && <p className="estado-msg erro">Erro ao carregar desafio.</p>}

        {estado === "ok" && desafio && (
          <div className="bloco-card desafio-card">
            <h2 className="bloco-nome">🏆 Desafio do Dia</h2>
            <p className="desafio-nome">{desafio.nome}</p>

            {/* Input de pontuação — só para admin e desafio aberto */}
            {isAdmin && !desafio.fechado && (
              <form className="pontuacao-form" onSubmit={adicionar}>
                <input
                  ref={nomeRef}
                  className="input-exercicio"
                  placeholder="Nome do aluno"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                />
                <input
                  className="input-pontuacao"
                  placeholder="Pontuação"
                  value={novoValor}
                  onChange={e => setNovoValor(e.target.value)}
                />
                <button className="btn-publicar" type="submit" disabled={salvando}>
                  {salvando ? "..." : "OK"}
                </button>
              </form>
            )}

            {/* Ranking */}
            {ranking.length > 0 && (
              <ol className="ranking-list" style={{ marginTop: 14 }}>
                {ranking.map((p, i) => (
                  <li key={p.id} className={`ranking-item pos-${i + 1}`}>
                    <span className="medalha">{MEDALHAS[i] ?? `${i + 1}º`}</span>
                    <span className="ranking-nome">{p.aluno_nome}</span>
                    <span className="ranking-valor">{p.valor}</span>
                    {isAdmin && !desafio.fechado && (
                      <button
                        className="btn-icon danger"
                        style={{ marginLeft: "auto" }}
                        onClick={() => remover(p.id)}
                      >✕</button>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {ranking.length === 0 && (
              <p className="estado-hint" style={{ marginTop: 12 }}>
                Nenhuma pontuação lançada ainda.
              </p>
            )}

            {isAdmin && !desafio.fechado && ranking.length > 0 && (
              <button className="btn-publicar" style={{ marginTop: 16, width: "100%" }} onClick={fechar}>
                Publicar ranking final
              </button>
            )}

            {desafio.fechado && (
              <p className="status-badge publicado" style={{ marginTop: 12, display: "inline-block" }}>
                ✓ Ranking finalizado
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
