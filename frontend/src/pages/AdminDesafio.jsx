import { useEffect, useRef, useState } from "react";
import { deletePontuacao, fecharDesafio, getDesafioHoje, postPontuacao } from "../api/desafio";
import { getRankingAnual, getEvolucaoAluno } from "../api/ranking";

const MEDALHAS = ["🥇", "🥈", "🥉"];
const numVal = v => parseFloat(v) || 0;

function fmt(data) {
  const [a, m, d] = data.split("-");
  return `${d}/${m}`;
}

export default function AdminDesafio({ isAdmin }) {
  const [aba, setAba]           = useState("hoje");
  const [desafio, setDesafio]   = useState(null);
  const [estadoHoje, setEstadoHoje] = useState("carregando");
  const [anual, setAnual]       = useState([]);
  const [estadoAnual, setEstadoAnual] = useState("carregando");
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [evolucao, setEvolucao] = useState([]);
  const nomeRef = useRef(null);

  function carregarHoje() {
    getDesafioHoje()
      .then(d => { setDesafio(d); setEstadoHoje("ok"); })
      .catch(err => setEstadoHoje(err.message.includes("404") ? "vazio" : "erro"));
  }

  function carregarAnual() {
    getRankingAnual()
      .then(r => { setAnual(r); setEstadoAnual("ok"); })
      .catch(() => setEstadoAnual("erro"));
  }

  useEffect(() => { carregarHoje(); carregarAnual(); }, []);

  async function verEvolucao(nome) {
    setAlunoSelecionado(nome);
    try {
      const data = await getEvolucaoAluno(nome);
      setEvolucao(data);
    } catch { setEvolucao([]); }
  }

  const ranking = desafio
    ? [...desafio.pontuacoes].sort((a, b) => numVal(b.valor) - numVal(a.valor))
    : [];

  async function adicionar(e) {
    e.preventDefault();
    if (!novoNome.trim() || !novoValor.trim()) return;
    setSalvando(true);
    try {
      await postPontuacao(desafio.id, novoNome.trim(), novoValor.trim());
      setNovoNome(""); setNovoValor("");
      carregarHoje(); carregarAnual();
      nomeRef.current?.focus();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  }

  async function remover(id) {
    await deletePontuacao(id).catch(err => alert(err.message));
    carregarHoje(); carregarAnual();
  }

  async function fechar() {
    await fecharDesafio(desafio.id).catch(err => alert(err.message));
    carregarHoje();
  }

  return (
    <div className="page">
      <header className="app-header">
        <span className="logo">Focus Fitness</span>
        {isAdmin && <span className="admin-badge">Desafio</span>}
      </header>

      {/* Abas */}
      <div className="tabs-bar">
        <button className={`tab-btn ${aba === "hoje" ? "ativo" : ""}`} onClick={() => { setAba("hoje"); setAlunoSelecionado(null); }}>
          Hoje
        </button>
        <button className={`tab-btn ${aba === "anual" ? "ativo" : ""}`} onClick={() => { setAba("anual"); setAlunoSelecionado(null); }}>
          Ranking Anual
        </button>
      </div>

      <main className="feed">

        {/* ── ABA HOJE ── */}
        {aba === "hoje" && (
          <>
            {estadoHoje === "carregando" && <div className="estado-vazio"><span className="estado-vazio-icon">⏳</span><p className="estado-vazio-titulo">Carregando...</p></div>}

            {estadoHoje === "vazio" && (
              <div className="estado-vazio">
                <span className="estado-vazio-icon">🏆</span>
                <p className="estado-vazio-titulo">Nenhum desafio hoje</p>
                <p className="estado-vazio-sub">Publique um treino com desafio na aba Admin.</p>
              </div>
            )}

            {estadoHoje === "ok" && desafio && (
              <div className="bloco-card desafio-card">
                <div className="bloco-header" style={{ borderColor: "#2e2600" }}>
                  <div className="bloco-accent" style={{ background: "#e8c847" }} />
                  <span className="bloco-nome">🏆 {desafio.nome}</span>
                  {desafio.fechado && <span className="status-badge publicado" style={{ marginLeft: "auto" }}>Finalizado</span>}
                </div>

                {isAdmin && !desafio.fechado && (
                  <form className="pontuacao-form" style={{ padding: "12px 14px 0" }} onSubmit={adicionar}>
                    <input ref={nomeRef} className="input-exercicio" placeholder="Nome do aluno"
                      value={novoNome} onChange={e => setNovoNome(e.target.value)} />
                    <input className="input-pontuacao" placeholder="Pont."
                      value={novoValor} onChange={e => setNovoValor(e.target.value)} />
                    <button className="btn-publicar" type="submit" disabled={salvando}>
                      {salvando ? "..." : "OK"}
                    </button>
                  </form>
                )}

                {ranking.length > 0
                  ? <ol className="ranking-list" style={{ padding: "12px" }}>
                      {ranking.map((p, i) => (
                        <li key={p.id} className={`ranking-item pos-${i + 1}`}>
                          <span className="medalha">{MEDALHAS[i] ?? `${i + 1}º`}</span>
                          <span className="ranking-nome">{p.aluno_nome}</span>
                          <span className="ranking-valor">{p.valor}</span>
                          {isAdmin && !desafio.fechado && (
                            <button className="btn-icon danger" style={{ marginLeft: "auto" }}
                              onClick={() => remover(p.id)}>✕</button>
                          )}
                        </li>
                      ))}
                    </ol>
                  : <p className="estado-hint" style={{ padding: "16px 14px" }}>Nenhuma pontuação lançada ainda.</p>
                }

                {isAdmin && !desafio.fechado && ranking.length > 0 && (
                  <div style={{ padding: "0 14px 14px" }}>
                    <button className="btn-publicar" style={{ width: "100%" }} onClick={fechar}>
                      Publicar ranking final
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── ABA ANUAL ── */}
        {aba === "anual" && !alunoSelecionado && (
          <>
            <p className="data-header" style={{ textAlign: "center", paddingTop: 4 }}>
              Ranking acumulado {new Date().getFullYear()}
            </p>

            {estadoAnual === "carregando" && <div className="estado-vazio"><span className="estado-vazio-icon">⏳</span></div>}

            {estadoAnual === "ok" && anual.length === 0 && (
              <div className="estado-vazio">
                <span className="estado-vazio-icon">📊</span>
                <p className="estado-vazio-titulo">Nenhum dado ainda</p>
                <p className="estado-vazio-sub">Lance pontuações nos desafios do dia para formar o ranking anual.</p>
              </div>
            )}

            {estadoAnual === "ok" && anual.length > 0 && (
              <div className="bloco-card desafio-card">
                <div className="bloco-header" style={{ borderColor: "#2e2600" }}>
                  <div className="bloco-accent" style={{ background: "#e8c847" }} />
                  <span className="bloco-nome">🏆 Ranking Anual</span>
                </div>
                <ol className="ranking-list" style={{ padding: "12px" }}>
                  {anual.map((a, i) => (
                    <li key={a.nome} className={`ranking-item pos-${i + 1}`}
                      style={{ cursor: "pointer" }} onClick={() => verEvolucao(a.nome)}>
                      <span className="medalha">{MEDALHAS[i] ?? `${i + 1}º`}</span>
                      <div style={{ flex: 1 }}>
                        <p className="ranking-nome">{a.nome}</p>
                        <p style={{ fontSize: 11, color: "var(--text-2)" }}>{a.participacoes} desafio{a.participacoes !== 1 ? "s" : ""}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p className="ranking-valor">{a.total.toFixed(0)}</p>
                        <p style={{ fontSize: 11, color: "var(--text-2)" }}>melhor: {a.melhor.toFixed(0)}</p>
                      </div>
                      <span style={{ color: "var(--text-3)", fontSize: 12, marginLeft: 6 }}>›</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}

        {/* ── EVOLUÇÃO DO ALUNO ── */}
        {aba === "anual" && alunoSelecionado && (
          <div className="bloco-card">
            <div className="bloco-header">
              <button className="btn-icon" onClick={() => setAlunoSelecionado(null)}>‹</button>
              <div className="bloco-accent" />
              <span className="bloco-nome">{alunoSelecionado}</span>
            </div>
            {evolucao.length === 0
              ? <p className="estado-hint" style={{ padding: 16 }}>Nenhum histórico encontrado.</p>
              : <ul className="linha-list">
                  {evolucao.map((e, i) => (
                    <li key={i} className="linha-item" style={{ cursor: "default" }}>
                      <div className="linha-row">
                        <div>
                          <p className="exercicio">{e.desafio}</p>
                          <p style={{ fontSize: 12, color: "var(--text-2)" }}>{fmt(e.data)}</p>
                        </div>
                        <span className="serie">{e.valor}</span>
                      </div>
                    </li>
                  ))}
                </ul>
            }
          </div>
        )}

      </main>
    </div>
  );
}
