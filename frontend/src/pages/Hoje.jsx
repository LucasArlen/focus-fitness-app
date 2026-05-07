import { useEffect, useState } from "react";
import { getTreinoHoje } from "../api/treino";
import { getStatus } from "../api/academia";
import { getPresencas, postPresenca, deletePresenca } from "../api/presenca";
import BlocoCard from "../components/BlocoCard";
import SugestaoCard from "../components/SugestaoCard";
import DesafioRanking from "../components/DesafioRanking";

const STATUS_CFG = {
  fechado:   { label: "Academia fechada", emoji: "🔒", cor: "#ff5252",  bg: "rgba(255,82,82,0.08)",   borda: "rgba(255,82,82,0.25)" },
  vazio:     { label: "Bem vazio",        emoji: "😌", cor: "#64b5f6",  bg: "rgba(100,181,246,0.08)", borda: "rgba(100,181,246,0.25)" },
  tranquilo: { label: "Tranquilo",        emoji: "👌", cor: "#4cd964",  bg: "rgba(76,217,100,0.08)",  borda: "rgba(76,217,100,0.25)" },
  cheio:     { label: "Cheio",            emoji: "🔥", cor: "#ff9800",  bg: "rgba(255,152,0,0.08)",   borda: "rgba(255,152,0,0.25)" },
  lotado:    { label: "Lotado",           emoji: "🚨", cor: "#ff5252",  bg: "rgba(255,82,82,0.08)",   borda: "rgba(255,82,82,0.25)" },
};

function formatarData(dataStr) {
  const [ano, mes, dia] = dataStr.split("-");
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    weekday: "short", day: "numeric", month: "short"
  });
}

function VouHoje({ treinoId }) {
  const storageKey = `presenca_${treinoId}`;
  const [confirmado, setConfirmado] = useState(() => !!localStorage.getItem(storageKey));
  const [presencas, setPresencas]   = useState({ nomes: [], total: 0 });
  const [salvando, setSalvando]     = useState(false);
  const [expandido, setExpandido]   = useState(false);

  useEffect(() => {
    getPresencas().then(setPresencas).catch(() => {});
  }, []);

  async function toggle() {
    setSalvando(true);
    try {
      if (confirmado) {
        await deletePresenca();
        localStorage.removeItem(storageKey);
        setConfirmado(false);
      } else {
        await postPresenca();
        localStorage.setItem(storageKey, "1");
        setConfirmado(true);
      }
      const dados = await getPresencas();
      setPresencas(dados);
    } catch { /* silencioso */ }
    finally { setSalvando(false); }
  }

  const total = presencas.total;

  return (
    <div className={`vou-strip ${confirmado ? "confirmado" : ""}`}>
      <div className="vou-strip-main" onClick={() => total > 0 && setExpandido(e => !e)}>
        <span className="vou-strip-texto">
          {confirmado
            ? `✅ Você vai hoje · ${total} ${total === 1 ? "pessoa" : "pessoas"}`
            : `💪 ${total > 0 ? `${total} vão hoje` : "Vai treinar hoje?"}`}
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {total > 0 && (
            <span className="vou-strip-chevron">{expandido ? "▴" : "▾"}</span>
          )}
          {!confirmado && (
            <button className="vou-strip-btn" disabled={salvando}
              onClick={e => { e.stopPropagation(); toggle(); }}>
              {salvando ? "..." : "Vou!"}
            </button>
          )}
          {confirmado && (
            <button className="vou-strip-cancelar" disabled={salvando}
              onClick={e => { e.stopPropagation(); toggle(); }}>
              {salvando ? "..." : "Cancelar"}
            </button>
          )}
        </div>
      </div>

      {expandido && total > 0 && (
        <div className="vou-strip-nomes">
          {presencas.nomes.map(n => (
            <span key={n} className="vou-nome-pill">{n.split(" ")[0]}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Hoje({ nomeAluno }) {
  const [treino, setTreino] = useState(null);
  const [estado, setEstado] = useState("carregando");
  const [statusAcad, setStatusAcad] = useState(null);

  useEffect(() => {
    getTreinoHoje()
      .then(t => { setTreino(t); setEstado("ok"); })
      .catch(err => setEstado(err.message.includes("404") ? "vazio" : "erro"));
    getStatus()
      .then(s => { if (s.ativo) setStatusAcad(s.status); })
      .catch(() => {});
  }, []);

  const cfg = statusAcad ? STATUS_CFG[statusAcad] : null;

  return (
    <div className="page">
      <header className="app-header">
        <span className="logo">Focus Fitness</span>
        {treino && <span className="data-header">{formatarData(treino.data)}</span>}
      </header>

      <main className="feed">
        {cfg && (
          <div className="status-banner" style={{ background: cfg.bg, borderColor: cfg.borda }}>
            <span className="status-banner-emoji">{cfg.emoji}</span>
            <div className="status-banner-texto">
              <span className="status-banner-label" style={{ color: cfg.cor }}>{cfg.label}</span>
              <span className="status-banner-sub">Agora na academia</span>
            </div>
          </div>
        )}

        {estado === "carregando" && (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">⏳</span>
            <p className="estado-vazio-titulo">Carregando treino...</p>
          </div>
        )}

        {estado === "vazio" && (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">🏋️</span>
            <p className="estado-vazio-titulo">Nenhum treino hoje</p>
            <p className="estado-vazio-sub">O treinador ainda não publicou o treino de hoje. Volta em breve!</p>
          </div>
        )}

        {estado === "erro" && (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">📡</span>
            <p className="estado-vazio-titulo">Sem conexão</p>
            <p className="estado-vazio-sub">Verifique sua internet e tente novamente.</p>
            <button className="btn-publicar" style={{ marginTop: 16 }} onClick={() => {
              setEstado("carregando");
              getTreinoHoje()
                .then(t => { setTreino(t); setEstado("ok"); })
                .catch(() => setEstado("erro"));
            }}>
              Tentar novamente
            </button>
          </div>
        )}

        {estado === "ok" && treino && (
          <>
            <VouHoje treinoId={treino.id} />

            {treino.blocos.map(bloco =>
              bloco.sugestao
                ? <SugestaoCard key={bloco.id} bloco={bloco} />
                : <BlocoCard key={bloco.id} bloco={bloco} />
            )}
            {treino.desafio && <DesafioRanking desafio={treino.desafio} />}
          </>
        )}
      </main>
    </div>
  );
}
