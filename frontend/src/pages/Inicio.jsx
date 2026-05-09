import { useEffect, useState } from "react";
import { getTreinoHoje, getTreinoUltimo } from "../api/treino";
import { getRankingMensal } from "../api/ranking";
import { getAvisos } from "../api/aviso";
import { getStatus } from "../api/academia";
import { freqMes, calcStreak } from "../hooks/useAluno";

const STATUS_CFG = {
  vazio:     { label: "bem vazia",  emoji: "😌", cor: "#64b5f6" },
  tranquilo: { label: "tranquila",  emoji: "👌", cor: "#4cd964" },
  cheio:     { label: "cheia",      emoji: "🔥", cor: "#ff9800" },
  lotado:    { label: "lotada",     emoji: "🚨", cor: "#ff5252" },
};

const CAT_CFG = {
  aviso:   { emoji: "📢", cor: "#64b5f6" },
  evento:  { emoji: "🏃", cor: "#e8ff47" },
  feriado: { emoji: "🎉", cor: "#ff9800" },
};

function fmt(dataStr) {
  const [a, m, d] = dataStr.split("-");
  return new Date(Number(a), Number(m) - 1, Number(d))
    .toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

export default function Inicio({ nome, apelido, onVerTreino, onVerAvisos, onVerPerfil, onLogoStart, onLogoEnd }) {
  const [treino,       setTreino]      = useState(null);
  const [treinoEstado, setTreinoEstado]= useState("carregando");
  const [treinoEhHoje, setTreinoEhHoje]= useState(true);
  const [ranking,      setRanking]     = useState([]);
  const [avisos,       setAvisos]      = useState([]);
  const [acadStatus,   setAcadStatus]  = useState(null);

  const streak      = calcStreak();
  const presencasMes = freqMes();

  useEffect(() => {
    getTreinoHoje()
      .then(t => { setTreino(t); setTreinoEhHoje(true); setTreinoEstado("ok"); })
      .catch(() => {
        getTreinoUltimo()
          .then(t => { setTreino(t); setTreinoEhHoje(false); setTreinoEstado("ok"); })
          .catch(() => setTreinoEstado("vazio"));
      });

    getRankingMensal()
      .then(r => setRanking(Array.isArray(r) ? r : []))
      .catch(() => {});

    getAvisos()
      .then(a => setAvisos(Array.isArray(a) ? a : []))
      .catch(() => {});

    getStatus()
      .then(s => { if (s?.ativo && s.status !== "fechado") setAcadStatus(s.status); })
      .catch(() => {});
  }, []);

  const campeao        = ranking[0] ?? null;
  const avisosPreview  = avisos.slice(0, 2);
  const totalExercicios = treino?.blocos.reduce((a, b) => a + b.linhas.length, 0) ?? 0;

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
      </header>

      <main className="feed">

        {/* ── PERFIL ── */}
        <div className="inicio-perfil-card" onClick={onVerPerfil}>
          <div className="inicio-perfil-avatar">
            {(nome || "?")[0].toUpperCase()}
          </div>
          <div className="inicio-perfil-info">
            <p className="inicio-perfil-nome">{nome || "Aluno"}</p>
            {apelido && <span className="apelido-sub">{apelido}</span>}
            <div className="inicio-perfil-stats">
              {streak > 0 && (
                <span className="inicio-stat-pill streak">🔥 {streak} {streak === 1 ? "dia" : "dias"}</span>
              )}
              <span className="inicio-stat-pill">📅 {presencasMes} este mês</span>
            </div>
          </div>
          <span className="inicio-perfil-chevron">›</span>
        </div>

        {/* ── STATUS DA ACADEMIA ── */}
        {acadStatus && STATUS_CFG[acadStatus] && (
          <div className="inicio-status-pill" style={{ color: STATUS_CFG[acadStatus].cor, borderColor: STATUS_CFG[acadStatus].cor + "44" }}>
            <span>{STATUS_CFG[acadStatus].emoji}</span>
            <span>Academia {STATUS_CFG[acadStatus].label} agora</span>
          </div>
        )}

        {/* ── TREINO DE HOJE ── */}
        <div
          className={`inicio-card ${treinoEstado === "ok" ? "clicavel" : ""}`}
          onClick={treinoEstado === "ok" ? onVerTreino : undefined}
        >
          <div className="inicio-card-header">
            <span className="inicio-card-icon">💪</span>
            <span className="inicio-card-titulo">Treino de hoje</span>
            {treinoEstado === "ok" && treinoEhHoje  && <span className="dash-badge ok"   style={{ marginLeft: "auto" }}>Publicado</span>}
            {treinoEstado === "ok" && !treinoEhHoje && <span className="dash-badge vazio" style={{ marginLeft: "auto" }}>Sem treino hoje</span>}
            {treinoEstado === "vazio"     && <span className="dash-badge vazio" style={{ marginLeft: "auto" }}>Sem treino</span>}
          </div>

          {treinoEstado === "ok" && treino && (
            <>
              <p className="inicio-card-sub">
                {fmt(treino.data)} · {treino.blocos.length} bloco{treino.blocos.length !== 1 ? "s" : ""} · {totalExercicios} exercício{totalExercicios !== 1 ? "s" : ""}
                {treino.desafio ? " · 🏆" : ""}
              </p>
              <p className="inicio-card-cta">{treinoEhHoje ? "Ver treino →" : "Ver último treino →"}</p>
            </>
          )}

          {treinoEstado === "vazio" && (
            <p className="inicio-card-sub">Nenhum treino publicado ainda.</p>
          )}

          {treinoEstado === "carregando" && (
            <p className="inicio-card-sub">Carregando...</p>
          )}
        </div>

        {/* ── CAMPEÃO DO MÊS ── */}
        {campeao && (
          <div className="inicio-card">
            <div className="inicio-card-header">
              <span className="inicio-card-icon">🏆</span>
              <span className="inicio-card-titulo">Campeão do mês</span>
            </div>
            <div className="inicio-campeao">
              <span className="inicio-campeao-medal">🥇</span>
              <span className="inicio-campeao-nome">{campeao.nome.split(" ")[0]}</span>
              <span className="inicio-campeao-reps">{campeao.total.toFixed(0)} reps</span>
            </div>
            {ranking[1] && (
              <div className="inicio-campeao inicio-campeao-2">
                <span className="inicio-campeao-medal">🥈</span>
                <span className="inicio-campeao-nome">{ranking[1].nome.split(" ")[0]}</span>
                <span className="inicio-campeao-reps">{ranking[1].total.toFixed(0)} reps</span>
              </div>
            )}
            {ranking[2] && (
              <div className="inicio-campeao inicio-campeao-3">
                <span className="inicio-campeao-medal">🥉</span>
                <span className="inicio-campeao-nome">{ranking[2].nome.split(" ")[0]}</span>
                <span className="inicio-campeao-reps">{ranking[2].total.toFixed(0)} reps</span>
              </div>
            )}
          </div>
        )}

        {/* ── AVISOS ── */}
        {avisosPreview.length > 0 && (
          <div className="inicio-card">
            <div className="inicio-card-header">
              <span className="inicio-card-icon">📢</span>
              <span className="inicio-card-titulo">Avisos</span>
              <button className="inicio-ver-mais" onClick={e => { e.stopPropagation(); onVerAvisos(); }}>
                Ver todos →
              </button>
            </div>
            {avisosPreview.map(a => {
              const cfg = CAT_CFG[a.categoria] || CAT_CFG.aviso;
              return (
                <div key={a.id} className="inicio-aviso-item" onClick={onVerAvisos}>
                  <span className="inicio-aviso-emoji" style={{ color: cfg.cor }}>{cfg.emoji}</span>
                  <span className="inicio-aviso-titulo">{a.titulo}</span>
                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
