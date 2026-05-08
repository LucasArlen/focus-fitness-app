import { useEffect, useRef, useState } from "react";
import { getChamada, marcarPresenca, desmarcarPresenca } from "../api/presenca";
import { getDesafioHoje, postPontuacao, deletePontuacao, fecharDesafio } from "../api/desafio";

export default function AdminModoAula({ onVoltar, onVerAlunos }) {
  const [chamada,   setChamada]   = useState([]);
  const [desafio,   setDesafio]   = useState(null);
  const [busca,     setBusca]     = useState("");
  const [marcando,  setMarcando]  = useState(null);
  const [editando,  setEditando]  = useState(null); // nome do aluno com campo aberto
  const [valorEdit, setValorEdit] = useState("");
  const [salvando,  setSalvando]  = useState(null);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);
  const inputRef = useRef(null);

  async function carregar() {
    const [c, d] = await Promise.allSettled([
      getChamada(),
      getDesafioHoje(),
    ]);
    if (c.status === "fulfilled") setChamada(c.value);
    if (d.status === "fulfilled") setDesafio(d.value);
    else setDesafio(null);
  }

  useEffect(() => { carregar(); }, []);

  // ── Presença ──────────────────────────────────────────────────
  const presentes = chamada
    .filter(a => a.presente)
    .sort((a, b) => a.ordem_chegada - b.ordem_chegada);

  const buscaNorm = busca.trim().toLowerCase();
  const sugestoes = buscaNorm
    ? chamada.filter(a => !a.presente && a.nome.toLowerCase().includes(buscaNorm)).slice(0, 5)
    : [];

  async function marcarAluno(nome) {
    setBusca("");
    setMarcando(nome);
    try {
      await marcarPresenca(nome);
      const nova = await getChamada();
      setChamada(nova);
    } catch { /* silencioso */ }
    finally { setMarcando(null); inputRef.current?.focus(); }
  }

  async function desmarcarAluno(nome) {
    setMarcando(nome);
    try {
      await desmarcarPresenca(nome);
      const nova = await getChamada();
      setChamada(nova);
    } catch { /* silencioso */ }
    finally { setMarcando(null); }
  }

  // ── Score ─────────────────────────────────────────────────────
  const scoreMap = {};
  (desafio?.pontuacoes ?? []).forEach(p => {
    scoreMap[p.aluno_nome.trim().toLowerCase()] = p;
  });

  function abrirEdicao(nome, valorAtual = "") {
    setEditando(nome);
    setValorEdit(valorAtual);
  }

  async function salvarScore(nome) {
    if (!valorEdit.trim() || !desafio) return;
    setSalvando(nome);
    try {
      await postPontuacao(desafio.id, nome, valorEdit.trim());
      const d = await getDesafioHoje();
      setDesafio(d);
      setEditando(null);
      setValorEdit("");
    } catch { /* silencioso */ }
    finally { setSalvando(null); }
  }

  async function removerScore(id) {
    try {
      await deletePontuacao(id);
      const d = await getDesafioHoje();
      setDesafio(d);
    } catch { /* silencioso */ }
  }

  async function fechar() {
    try {
      await fecharDesafio(desafio.id);
      await carregar();
      setConfirmandoFechar(false);
    } catch { /* silencioso */ }
  }

  const totalComScore = Object.keys(scoreMap).length;

  return (
    <div className="page">
      <header className="app-header">
        <button className="btn-voltar" onClick={onVoltar}>← Voltar</button>
        <span className="logo" style={{ fontSize: 16 }}>Modo Aula</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="dash-badge ok">{presentes.length}/{chamada.length}</span>
          {onVerAlunos && (
            <button className="btn-logout" onClick={onVerAlunos} title="Ver todos os alunos">👥</button>
          )}
        </div>
      </header>

      <main className="feed">

        {/* ── Busca de chegadas ── */}
        <div className="modoaula-busca-wrap">
          <input
            ref={inputRef}
            className="chamada-busca modoaula-busca"
            placeholder="🔍  Aluno chegou? Buscar..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            autoComplete="off"
          />
          {sugestoes.length > 0 && (
            <div className="dash-chamada-sugestoes">
              {sugestoes.map(a => (
                <button
                  key={a.nome}
                  className="dash-chamada-sug"
                  disabled={marcando === a.nome}
                  onClick={() => marcarAluno(a.nome)}
                >
                  {marcando === a.nome ? "⏳" : "✓"} {a.nome}
                </button>
              ))}
            </div>
          )}
          {buscaNorm && sugestoes.length === 0 && (
            <p className="dash-chamada-sem-result">Nenhum ausente com esse nome.</p>
          )}
        </div>

        {/* ── Label do desafio ── */}
        {desafio && (
          <div className="modoaula-desafio-label">
            <span>🏆 {desafio.nome}</span>
            {desafio.fechado
              ? <span className="dash-badge ok">Encerrado</span>
              : totalComScore > 0 && <span className="dash-badge aberto">{totalComScore} anotados</span>
            }
          </div>
        )}

        {/* ── Lista de presentes ── */}
        {presentes.length === 0 ? (
          <p className="dash-vazio-hint" style={{ textAlign: "center", paddingTop: 24 }}>
            Nenhum aluno marcado ainda.
          </p>
        ) : (
          <div className="modoaula-lista">
            {presentes.map(a => {
              const chave  = a.nome.trim().toLowerCase();
              const score  = scoreMap[chave];
              const editando_ = editando === a.nome;

              return (
                <div key={a.nome} className={`modoaula-row ${score ? "tem-score" : ""} ${editando_ ? "editando" : ""}`}>
                  <button
                    className="modoaula-desmarcar"
                    disabled={marcando === a.nome}
                    onClick={() => desmarcarAluno(a.nome)}
                    title="Desmarcar presença"
                  >✕</button>
                  <span className="modoaula-ordem">{a.ordem_chegada}º</span>
                  <span className="modoaula-nome">{a.nome}</span>

                  {/* Sem desafio ou desafio encerrado */}
                  {(!desafio || desafio.fechado) && score && (
                    <span className="modoaula-score-final">{score.valor}</span>
                  )}

                  {/* Desafio aberto — campo inline */}
                  {desafio && !desafio.fechado && (
                    editando_ ? (
                      <div className="modoaula-edit-wrap">
                        <input
                          className="modoaula-score-input"
                          value={valorEdit}
                          onChange={e => setValorEdit(e.target.value)}
                          placeholder="reps"
                          inputMode="numeric"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === "Enter")  salvarScore(a.nome);
                            if (e.key === "Escape") { setEditando(null); setValorEdit(""); }
                          }}
                        />
                        <button
                          className="modoaula-ok"
                          disabled={salvando === a.nome || !valorEdit.trim()}
                          onClick={() => salvarScore(a.nome)}
                        >
                          {salvando === a.nome ? "⏳" : "✓"}
                        </button>
                        <button className="modoaula-cancel" onClick={() => { setEditando(null); setValorEdit(""); }}>
                          ✕
                        </button>
                      </div>
                    ) : score ? (
                      <div className="modoaula-score-wrap">
                        <button
                          className="modoaula-score-val"
                          onClick={() => abrirEdicao(a.nome, score.valor)}
                          title="Toque para corrigir"
                        >
                          {score.valor}
                        </button>
                        <button className="modoaula-del" onClick={() => removerScore(score.id)}>✕</button>
                      </div>
                    ) : (
                      <button className="modoaula-add-score" onClick={() => abrirEdicao(a.nome)}>
                        + anotar
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Encerrar desafio ── */}
        {desafio && !desafio.fechado && totalComScore > 0 && (
          <div style={{ marginTop: 8 }}>
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

      </main>
    </div>
  );
}
