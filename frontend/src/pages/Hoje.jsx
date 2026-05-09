import { useEffect, useState } from "react";
import { getTreinoHoje, getTreinoUltimo } from "../api/treino";
import { getStatus } from "../api/academia";
import { getPresencas } from "../api/presenca";
import BlocoCard from "../components/BlocoCard";
import SugestaoCard from "../components/SugestaoCard";
import { getVapidKey, subscribePush, urlBase64ToUint8Array } from "../api/push";

const STATUS_CFG = {
  fechado:   { label: "Academia fechada", emoji: "🔒", cor: "#ff5252",  bg: "rgba(255,82,82,0.07)",    borda: "rgba(255,82,82,0.22)" },
  vazio:     { label: "Bem vazio",        emoji: "😌", cor: "#64b5f6",  bg: "rgba(100,181,246,0.07)",  borda: "rgba(100,181,246,0.22)" },
  tranquilo: { label: "Tranquilo",        emoji: "👌", cor: "#4cd964",  bg: "rgba(76,217,100,0.07)",   borda: "rgba(76,217,100,0.22)" },
  cheio:     { label: "Cheio",            emoji: "🔥", cor: "#ff9800",  bg: "rgba(255,152,0,0.07)",    borda: "rgba(255,152,0,0.22)" },
  lotado:    { label: "Lotado",           emoji: "🚨", cor: "#ff5252",  bg: "rgba(255,82,82,0.07)",    borda: "rgba(255,82,82,0.22)" },
};

// ── Notificações ────────────────────────────────────────────────────────────

const NOTIF_SUPPORTED =
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

function useNotifEstado() {
  const [estado, setEstado] = useState(() => {
    if (!NOTIF_SUPPORTED) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied")  return "denied";
    if (localStorage.getItem("notif_dismissed")) return "dismissed";
    return "pending";
  });
  return [estado, setEstado];
}

function NotifBanner() {
  const [estado, setEstado] = useNotifEstado();
  const [carregando, setCarregando] = useState(false);

  async function ativar() {
    setCarregando(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setEstado("denied"); return; }

      const reg      = await navigator.serviceWorker.ready;
      const vapidKey = await getVapidKey();
      const sub      = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const { endpoint, keys } = sub.toJSON();
      await subscribePush({ endpoint, keys });
      setEstado("granted");
    } catch {
      setEstado("dismissed");
    } finally {
      setCarregando(false);
    }
  }

  function dispensar() {
    localStorage.setItem("notif_dismissed", "1");
    setEstado("dismissed");
  }

  if (estado !== "pending") return null;

  return (
    <div className="notif-banner">
      <span className="notif-banner-icon">🔔</span>
      <span className="notif-banner-texto">Aviso quando o treino for publicado</span>
      <button className="notif-banner-btn" onClick={ativar} disabled={carregando}>
        {carregando ? "..." : "Ativar"}
      </button>
      <button className="notif-banner-fechar" onClick={dispensar} aria-label="Fechar">✕</button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function formatarData(dataStr) {
  const [ano, mes, dia] = dataStr.split("-");
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    weekday: "short", day: "numeric", month: "short"
  });
}

function PresencasHoje() {
  const [presencas, setPresencas] = useState({ nomes: [], total: 0 });
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    getPresencas().then(setPresencas).catch(() => {});
  }, []);

  const total = presencas.total;
  if (total === 0) return null;

  return (
    <div className="vou-strip" onClick={() => setExpandido(e => !e)} style={{ cursor: "pointer" }}>
      <div className="vou-strip-main">
        <span className="vou-strip-texto">
          💪 {total} {total === 1 ? "pessoa está" : "pessoas estão"} treinando hoje
        </span>
        <span className="vou-strip-chevron">{expandido ? "▴" : "▾"}</span>
      </div>
      {expandido && (
        <div className="vou-strip-nomes">
          {presencas.nomes.map(n => (
            <span key={n} className="vou-nome-pill">{n.split(" ")[0]}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Hoje({ nomeAluno, onLogoStart, onLogoEnd, onVerDesafio }) {
  const [treino,    setTreino]    = useState(null);
  const [estado,    setEstado]    = useState("carregando");
  const [ehHoje,    setEhHoje]    = useState(true);   // false = mostrando último treino
  const [statusAcad, setStatusAcad] = useState(null);

  useEffect(() => {
    getTreinoHoje()
      .then(t => { setTreino(t); setEhHoje(true); setEstado("ok"); })
      .catch(() => {
        // Sem treino hoje — tenta carregar o último publicado
        getTreinoUltimo()
          .then(t => { setTreino(t); setEhHoje(false); setEstado("ok"); })
          .catch(() => setEstado("vazio"));
      });
    getStatus()
      .then(s => { if (s.ativo) setStatusAcad(s.status); })
      .catch(() => {});
  }, []);

  const cfg = statusAcad ? STATUS_CFG[statusAcad] : null;

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
            <span className="estado-vazio-icon">😴</span>
            <p className="estado-vazio-titulo">Nenhum treino publicado ainda</p>
          </div>
        )}

        {estado === "ok" && treino && (
          <>
            <NotifBanner />
            {!ehHoje && (
              <div className="ultimo-treino-banner">
                <span>📅</span>
                <span>Sem treino hoje — mostrando o último: <strong>{formatarData(treino.data)}</strong></span>
              </div>
            )}
            {ehHoje && <PresencasHoje />}

            {treino.blocos.map(bloco =>
              bloco.sugestao
                ? <SugestaoCard key={bloco.id} bloco={bloco} />
                : <BlocoCard key={bloco.id} bloco={bloco} />
            )}
            {treino.desafio && (
              <button className="desafio-teaser" onClick={onVerDesafio}>
                <span className="desafio-teaser-icon">🏆</span>
                <span className="desafio-teaser-nome">{treino.desafio.nome}</span>
                <span className="desafio-teaser-cta">
                  {treino.desafio.pontuacoes?.length > 0 ? "Ver ranking →" : "Ver desafio →"}
                </span>
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
