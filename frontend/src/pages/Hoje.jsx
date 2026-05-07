import { useEffect, useState } from "react";
import { getTreinoHoje } from "../api/treino";
import { getStatus } from "../api/academia";
import { getPresencas, postPresenca, deletePresenca } from "../api/presenca";
import BlocoCard from "../components/BlocoCard";
import SugestaoCard from "../components/SugestaoCard";
import DesafioRanking from "../components/DesafioRanking";
import { getVapidKey, subscribePush, urlBase64ToUint8Array } from "../api/push";

const STATUS_CFG = {
  fechado:   { label: "Academia fechada", emoji: "🔒", cor: "#DC2626",  bg: "rgba(220,38,38,0.07)",    borda: "rgba(220,38,38,0.2)" },
  vazio:     { label: "Bem vazio",        emoji: "😌", cor: "#2563EB",  bg: "rgba(37,99,235,0.06)",    borda: "rgba(37,99,235,0.18)" },
  tranquilo: { label: "Tranquilo",        emoji: "👌", cor: "#16A34A",  bg: "rgba(22,163,74,0.07)",    borda: "rgba(22,163,74,0.2)" },
  cheio:     { label: "Cheio",            emoji: "🔥", cor: "#D97706",  bg: "rgba(217,119,6,0.07)",    borda: "rgba(217,119,6,0.22)" },
  lotado:    { label: "Lotado",           emoji: "🚨", cor: "#DC2626",  bg: "rgba(220,38,38,0.07)",    borda: "rgba(220,38,38,0.2)" },
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

export default function Hoje({ nomeAluno, onLogoStart, onLogoEnd }) {
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
            <NotifBanner />
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
