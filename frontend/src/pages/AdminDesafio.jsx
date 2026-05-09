import { useEffect, useRef, useState } from "react";
import { deletePontuacao, fecharDesafio, getDesafioHoje, postPontuacao } from "../api/desafio";
import { getRankingMensal, getEvolucaoAluno } from "../api/ranking";
import { getChamada } from "../api/presenca";

const MEDALHAS = ["🥇", "🥈", "🥉"];
const numVal = v => parseFloat(v) || 0;

function calcMeses() {
  const hoje = new Date();
  const mesAtual   = hoje.toISOString().slice(0, 7);
  const dtPassado  = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const mesPassado = dtPassado.toISOString().slice(0, 7);
  const nomeAtual  = hoje.toLocaleString("pt-BR", { month: "long" });
  const nomePassado = dtPassado.toLocaleString("pt-BR", { month: "long" });
  return { mesAtual, mesPassado, nomeAtual, nomePassado };
}

const { mesAtual, mesPassado, nomeAtual, nomePassado } = calcMeses();

function fmt(data) {
  const [a, m, d] = data.split("-");
  return `${d}/${m}`;
}

function euSou(nome, ref) {
  return ref && nome.trim().toLowerCase() === ref.trim().toLowerCase();
}

export default function AdminDesafio({ isAdmin, nomeAluno, freqMes, onLogoStart, onLogoEnd }) {
  const [aba, setAba]               = useState("hoje");
  const [desafio, setDesafio]       = useState(null);
  const [estadoHoje, setEstadoHoje] = useState("carregando");
  const [anual, setAnual]           = useState([]);
  const [estadoAnual, setEstadoAnual] = useState("carregando");
  const [rankingPassado, setRankingPassado] = useState([]);
  const [novoNome, setNovoNome]     = useState("");
  const [novoValor, setNovoValor]   = useState("");
  const [salvando, setSalvando]     = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [evolucao, setEvolucao]     = useState([]);
  const [chamada, setChamada]       = useState([]);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);
  const nomeRef  = useRef(null);
  const valorRef = useRef(null);

  function carregarHoje() {
    getDesafioHoje()
      .then(d => { setDesafio(d); setEstadoHoje("ok"); })
      .catch(err => setEstadoHoje(err.message.includes("404") ? "vazio" : "erro"));
  }

  function carregarAnual() {
    getRankingMensal(mesAtual)
      .then(r => { setAnual(r); setEstadoAnual("ok"); })
      .catch(() => setEstadoAnual("erro"));
    getRankingMensal(mesPassado)
      .then(setRankingPassado)
      .catch(() => {});
  }

  useEffect(() => {
    carregarHoje();
    carregarAnual();
    if (isAdmin) getChamada().then(setChamada).catch(() => {});
  }, [isAdmin]);

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

  // Alunos presentes divididos entre: já pontuados / ainda não pontuados
  const nomesJaScorados = new Set(
    (desafio?.pontuacoes ?? []).map(p => p.aluno_nome.trim().toLowerCase())
  );
  const presentesSemScore = chamada
    .filter(a => a.presente && !nomesJaScorados.has(a.nome.trim().toLowerCase()))
    .sort((a, b) => a.ordem_chegada - b.ordem_chegada);

  function selecionarAluno(nome) {
    setNovoNome(nome);
    setTimeout(() => valorRef.current?.focus(), 50);
  }

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
    setConfirmandoFechar(false);
    carregarHoje();
  }

  // Dados pessoais do aluno no ranking anual
  const meuIdx  = anual.findIndex(a => euSou(a.nome, nomeAluno));
  const meuDado = meuIdx >= 0 ? anual[meuIdx] : null;

  return (
    <div className="page">
      <header className="app-header">
        <span
            className="logo"
            onMouseDown={onLogoStart}
            onMouseUp={onLogoEnd}
            onMouseLeave={onLogoEnd}
            onTouchStart={onLogoStart}
            onTouchEnd={onLogoEnd}
            onTouchCancel={onLogoEnd}
            onContextMenu={e => e.preventDefault()}
          >Focus Fitness</span>
        {isAdmin
          ? <span className="admin-badge">Desafio</span>
          : nomeAluno && <span className="aluno-chip">👤 {nomeAluno}</span>
        }
      </header>

      {/* Abas */}
      <div className="tabs-bar">
        <button className={`tab-btn ${aba === "hoje" ? "ativo" : ""}`}
          onClick={() => { setAba("hoje"); setAlunoSelecionado(null); }}>
          Hoje
        </button>
        <button className={`tab-btn ${aba === "anual" ? "ativo" : ""}`}
          onClick={() => { setAba("anual"); setAlunoSelecionado(null); }}>
          Ranking
        </button>
      </div>

      <main className="feed">

        {/* ── ABA HOJE ── */}
        {aba === "hoje" && (
          <>
            {estadoHoje === "carregando" && (
              <div className="estado-vazio">
                <span className="estado-vazio-icon">⏳</span>
                <p className="estado-vazio-titulo">Carregando...</p>
              </div>
            )}

            {estadoHoje === "vazio" && (
              <div className="estado-vazio">
                <span className="estado-vazio-icon">🏆</span>
                <p className="estado-vazio-titulo">Nenhum desafio hoje</p>
                <p className="estado-vazio-sub">Publique um treino com desafio na aba Admin.</p>
              </div>
            )}

            {estadoHoje === "ok" && desafio && (
              <div className="bloco-card desafio-card">
                <div className="bloco-header">
                  <div className="bloco-accent" />
                  <span className="bloco-nome">🏆 {desafio.nome}</span>
                  {desafio.fechado && (
                    <span className="status-badge publicado" style={{ marginLeft: "auto" }}>Finalizado</span>
                  )}
                </div>

                {/* ── ADMIN: marcar pontuações ── */}
                {isAdmin && !desafio.fechado && (
                  <div className="desafio-admin-wrap">

                    {/* Chips de alunos presentes sem score */}
                    {presentesSemScore.length > 0 && (
                      <div className="desafio-presentes">
                        <p className="desafio-presentes-label">
                          Presentes sem pontuação ({presentesSemScore.length})
                        </p>
                        <div className="desafio-presentes-chips">
                          {presentesSemScore.map(a => (
                            <button
                              key={a.nome}
                              className={`desafio-chip ${novoNome === a.nome ? "ativo" : ""}`}
                              onClick={() => selecionarAluno(a.nome)}
                            >
                              {a.nome.split(" ")[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {presentesSemScore.length === 0 && chamada.filter(a => a.presente).length > 0 && (
                      <p className="desafio-todos-ok">✅ Todos os presentes foram pontuados</p>
                    )}

                    {/* Formulário */}
                    <form className="pontuacao-form" onSubmit={adicionar}>
                      <input
                        ref={nomeRef}
                        className="input-exercicio"
                        placeholder="Nome do aluno"
                        value={novoNome}
                        onChange={e => setNovoNome(e.target.value)}
                      />
                      <input
                        ref={valorRef}
                        className="input-pontuacao"
                        placeholder="Reps"
                        value={novoValor}
                        onChange={e => setNovoValor(e.target.value)}
                        inputMode="numeric"
                      />
                      <button className="btn-publicar" type="submit" disabled={salvando}>
                        {salvando ? "..." : "OK"}
                      </button>
                    </form>
                  </div>
                )}

                {/* Ranking */}
                {ranking.length > 0 ? (
                  <>
                    <div className="podio">
                      {ranking.slice(0, 3).map((p, i) => (
                        <div key={p.id}
                          className={`podio-item pos-${i + 1} ${euSou(p.aluno_nome, nomeAluno) ? "meu-podio" : ""}`}>
                          <span className="podio-medalha">{MEDALHAS[i]}</span>
                          <span className="podio-nome">{p.aluno_nome.split(" ")[0]}</span>
                          <span className="podio-valor">{p.valor}</span>
                          {isAdmin && !desafio.fechado && (
                            <button className="btn-icon danger podio-del"
                              onClick={() => remover(p.id)}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>

                    {ranking.length > 3 && (
                      <ol className="ranking-list ranking-rest" style={{ padding: "0 12px 12px" }}>
                        {ranking.slice(3).map((p, i) => (
                          <li key={p.id}
                            className={`ranking-item ${euSou(p.aluno_nome, nomeAluno) ? "minha-linha" : ""}`}>
                            <span className="medalha" style={{ fontSize: 13, color: "var(--text-3)" }}>{i + 4}º</span>
                            <span className="ranking-nome">{p.aluno_nome}</span>
                            <span className="ranking-valor">{p.valor}</span>
                            {isAdmin && !desafio.fechado && (
                              <button className="btn-icon danger" style={{ marginLeft: "auto" }}
                                onClick={() => remover(p.id)}>✕</button>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </>
                ) : (
                  <p className="estado-hint" style={{ padding: "16px 14px" }}>
                    Nenhuma pontuação lançada ainda.
                  </p>
                )}

                {/* Encerrar desafio */}
                {isAdmin && !desafio.fechado && ranking.length > 0 && (
                  <div style={{ padding: "0 14px 14px" }}>
                    {!confirmandoFechar ? (
                      <button className="btn-fechar-desafio" onClick={() => setConfirmandoFechar(true)}>
                        🏁 Encerrar e publicar ranking
                      </button>
                    ) : (
                      <div className="desafio-confirm-fechar">
                        <span>Encerrar definitivamente? Não dá pra adicionar mais pontuações.</span>
                        <div className="desafio-confirm-acoes">
                          <button className="btn-publicar" onClick={fechar}>Confirmar</button>
                          <button className="btn-cancelar-sm" onClick={() => setConfirmandoFechar(false)}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── ABA ANUAL ── */}
        {aba === "anual" && !alunoSelecionado && (
          <>
            {/* Card "Meu Desempenho" — só para alunos */}
            {!isAdmin && nomeAluno && estadoAnual === "ok" && (
              <div className="meu-desempenho-card">
                <div className="meu-desempenho-header">
                  <span className="meu-desempenho-nome">👤 {nomeAluno}</span>
                  {freqMes > 0 && (
                    <span className="meu-desempenho-freq">
                      🗓 {freqMes} {freqMes === 1 ? "dia" : "dias"} em {nomeAtual}
                    </span>
                  )}
                </div>

                {meuDado ? (
                  <div className="meu-stat-grid">
                    <div className="meu-stat">
                      <span className="meu-stat-valor">
                        {meuIdx === 0 ? "🥇" : meuIdx === 1 ? "🥈" : meuIdx === 2 ? "🥉" : `${meuIdx + 1}º`}
                      </span>
                      <span className="meu-stat-label">Posição</span>
                    </div>
                    <div className="meu-stat">
                      <span className="meu-stat-valor">{meuDado.participacoes}</span>
                      <span className="meu-stat-label">Desafios</span>
                    </div>
                    <div className="meu-stat">
                      <span className="meu-stat-valor">{meuDado.melhor.toFixed(0)}</span>
                      <span className="meu-stat-label">Melhor (reps)</span>
                    </div>
                    <div className="meu-stat">
                      <span className="meu-stat-valor">{meuDado.total.toFixed(0)}</span>
                      <span className="meu-stat-label">Total (reps)</span>
                    </div>
                  </div>
                ) : (
                  <p className="meu-desempenho-vazio">
                    Participe dos desafios para aparecer no ranking 💪
                  </p>
                )}
              </div>
            )}

            {/* ── Card mês passado ── */}
            {rankingPassado.length > 0 && (
              <div className="bloco-card desafio-card ranking-passado-card">
                <div className="bloco-header">
                  <div className="bloco-accent" />
                  <span className="bloco-nome">🏅 Melhores de {nomePassado}</span>
                </div>
                <ol className="ranking-list ranking-rest" style={{ padding: "8px 12px 12px" }}>
                  {rankingPassado.slice(0, 3).map((a, i) => (
                    <li key={a.nome} className={`ranking-item pos-${i + 1} ${euSou(a.nome, nomeAluno) ? "minha-linha" : ""}`}>
                      <span className="medalha">{MEDALHAS[i]}</span>
                      <span className="ranking-nome">{a.nome}</span>
                      <div style={{ textAlign: "right" }}>
                        <p className="ranking-valor">{a.total.toFixed(0)} reps</p>
                        <p style={{ fontSize: 11, color: "var(--text-2)" }}>{a.participacoes} desafio{a.participacoes !== 1 ? "s" : ""}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <p className="data-header" style={{ textAlign: "center", paddingTop: 4, textTransform: "capitalize" }}>
              Ranking de {nomeAtual}
            </p>

            {estadoAnual === "carregando" && (
              <div className="estado-vazio"><span className="estado-vazio-icon">⏳</span></div>
            )}

            {estadoAnual === "ok" && anual.length === 0 && (
              <div className="estado-vazio">
                <span className="estado-vazio-icon">📊</span>
                <p className="estado-vazio-titulo">Nenhum dado ainda</p>
                <p className="estado-vazio-sub">Lance pontuações nos desafios do dia para formar o ranking.</p>
              </div>
            )}

            {estadoAnual === "ok" && anual.length > 0 && (
              <div className="bloco-card desafio-card">
                <div className="bloco-header">
                  <div className="bloco-accent" />
                  <span className="bloco-nome" style={{ textTransform: "capitalize" }}>🏆 {nomeAtual}</span>
                </div>
                <ol className="ranking-list ranking-rest" style={{ padding: "12px", maxHeight: "none" }}>
                  {anual.map((a, i) => (
                    <li key={a.nome}
                      className={`ranking-item pos-${i + 1} ${euSou(a.nome, nomeAluno) ? "minha-linha" : ""}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => verEvolucao(a.nome)}>
                      <span className="medalha">{MEDALHAS[i] ?? `${i + 1}º`}</span>
                      <div style={{ flex: 1 }}>
                        <p className="ranking-nome">{a.nome}</p>
                        <p style={{ fontSize: 11, color: "var(--text-2)" }}>
                          {a.participacoes} desafio{a.participacoes !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p className="ranking-valor">{a.total.toFixed(0)} reps</p>
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
