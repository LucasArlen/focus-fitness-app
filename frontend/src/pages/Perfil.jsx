import { useEffect, useRef, useState } from "react";
import { getPerfil, updatePerfil } from "../api/aluno";

// ── Detecção de ambiente de instalação ──────────────────────────────────────
const _standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const _isIOS      = /iphone|ipad|ipod/i.test(navigator.userAgent);
const _isIOSSafari = _isIOS && /safari/i.test(navigator.userAgent) && !/crios|fxios|opios|mercury/i.test(navigator.userAgent);

function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  useEffect(() => {
    if (_standalone || _isIOS) return;
    function handler(e) { e.preventDefault(); setPrompt(e); }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return [prompt, () => setPrompt(null)];
}
import { freqMes, calcStreak } from "../hooks/useAluno";
import { getVapidKey, subscribePush, urlBase64ToUint8Array } from "../api/push";
import { getEvolucaoAluno } from "../api/ranking";

const NOTIF_SUPPORTED =
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

function getNotifEstado() {
  if (!NOTIF_SUPPORTED) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied")  return "denied";
  if (localStorage.getItem("notif_dismissed")) return "dismissed";
  return "pending";
}

function comprimirFoto(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size   = 150;
      const canvas = document.createElement("canvas");
      canvas.width  = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const min = Math.min(img.width, img.height);
      const sx  = (img.width  - min) / 2;
      const sy  = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.src = url;
  });
}

export default function Perfil({ nome, apelido, onSalvarApelido, onSalvarFoto, onTrocarNome, onLogoStart, onLogoEnd }) {
  const [apelidoServidor, setApelidoServidor] = useState(apelido || null);
  const [foto,      setFoto]      = useState(null);
  const [carregando,setCarregando]= useState(true);
  const [salvando,  setSalvando]  = useState(false);
  const [fotoAlterada, setFotoAlterada] = useState(false);
  const [erroSalvar,setErroSalvar]= useState("");
  const [notif,     setNotif]     = useState(getNotifEstado);
  const [notifLoad, setNotifLoad] = useState(false);
  const [evolucao,  setEvolucao]  = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    getPerfil()
      .then(p => {
        if (p.apelido) { setApelidoServidor(p.apelido); onSalvarApelido(p.apelido); }
        if (p.foto)    { setFoto(p.foto); onSalvarFoto?.(p.foto); }
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
    if (nome) {
      getEvolucaoAluno(nome).then(setEvolucao).catch(() => {});
    }
  }, [nome]);

  async function escolherFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await comprimirFoto(file);
    setFoto(base64);
    setFotoAlterada(true);
  }

  async function salvar() {
    setSalvando(true);
    setErroSalvar("");
    try {
      await updatePerfil({ foto: foto || null });
      onSalvarFoto?.(foto || null);
      setFotoAlterada(false);
    } catch (err) {
      setErroSalvar(err.message || "Erro ao salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function ativarNotif() {
    setNotifLoad(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setNotif("denied"); return; }
      const reg      = await navigator.serviceWorker.ready;
      const vapidKey = await getVapidKey();
      const sub      = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const { endpoint, keys } = sub.toJSON();
      await subscribePush({ endpoint, keys });
      localStorage.removeItem("notif_dismissed");
      setNotif("granted");
    } catch {
      setNotif("dismissed");
    } finally {
      setNotifLoad(false);
    }
  }

  function dispensarNotif() {
    localStorage.setItem("notif_dismissed", "1");
    setNotif("dismissed");
  }

  const [installPrompt, clearPrompt] = useInstallPrompt();
  const inicial = (nome || "?")[0].toUpperCase();
  const freq    = freqMes();
  const streak  = calcStreak();
  const mesNome = new Date().toLocaleString("pt-BR", { month: "long" });

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
        {/* ── Avatar + nome ── */}
        <div className="perfil-hero">
          <div className="perfil-avatar-wrap" onClick={() => fileRef.current?.click()}>
            {foto
              ? <img className="perfil-avatar" src={foto} alt="avatar" />
              : <div className="perfil-avatar perfil-avatar-placeholder">
                  <span className="perfil-avatar-inicial">{inicial}</span>
                </div>
            }
            <span className="perfil-avatar-edit">✎</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={escolherFoto} />
          <p className="perfil-display-nome">{nome}</p>
          {apelidoServidor && <span className="apelido-sub" style={{ marginTop: 2 }}>{apelidoServidor}</span>}
        </div>

        {/* ── Editar perfil ── */}
        <div className="perfil-section">
          <div className="perfil-row">
            <span className="perfil-label">Nome</span>
            <span className="perfil-value-readonly">{nome}</span>
          </div>
          <div className="perfil-row">
            <span className="perfil-label">Apelido</span>
            <span className="perfil-value-readonly">{apelidoServidor || "—"}</span>
          </div>
          {apelidoServidor && (
            <div style={{ fontSize: 11, color: "var(--text-3)", padding: "0 16px 10px" }}>
              Definido pelo seu instrutor.
            </div>
          )}
        </div>

        {erroSalvar && (
          <p style={{ color: "var(--danger)", fontSize: 13, padding: "0 4px" }}>{erroSalvar}</p>
        )}

        {fotoAlterada && (
          <button className="dash-action-btn dash-action-btn-destaque" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "💾  Salvar foto"}
          </button>
        )}

        {/* ── Frequência + Streak ── */}
        <div className="perfil-section">
          <div className="perfil-stat-grid">
            <div className="perfil-stat">
              <span className="perfil-stat-val">{freq}</span>
              <span className="perfil-stat-label">dias em {mesNome}</span>
            </div>
            <div className="perfil-stat">
              <span className="perfil-stat-val">{(() => {
                const freq2 = JSON.parse(localStorage.getItem("aluno_freq") || "[]");
                const ano   = new Date().getFullYear().toString();
                return freq2.filter(d => d.startsWith(ano)).length;
              })()}</span>
              <span className="perfil-stat-label">dias em {new Date().getFullYear()}</span>
            </div>
            {streak > 0 && (
              <div className="perfil-stat perfil-stat-streak">
                <span className="perfil-stat-val">🔥 {streak}</span>
                <span className="perfil-stat-label">{streak === 1 ? "dia seguido" : "dias seguidos"}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Notificações ── */}
        {NOTIF_SUPPORTED && (
          <div className="perfil-section">
            <div className="perfil-notif-row">
              <span className="perfil-notif-icon">🔔</span>
              <div style={{ flex: 1 }}>
                <p className="perfil-notif-label">Notificações</p>
                <p className="perfil-notif-sub">
                  {notif === "granted"   ? "Ativadas — você recebe avisos de treino"   :
                   notif === "denied"    ? "Bloqueadas no navegador"                    :
                                          "Aviso quando o treino for publicado"}
                </p>
              </div>
              {notif === "granted" && (
                <button className="perfil-notif-btn on" onClick={dispensarNotif}>Ativado</button>
              )}
              {(notif === "pending" || notif === "dismissed") && (
                <button className="perfil-notif-btn" onClick={ativarNotif} disabled={notifLoad}>
                  {notifLoad ? "..." : "Ativar"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Evolução nos desafios ── */}
        {evolucao.length > 0 && (
          <div className="perfil-section">
            <p className="perfil-section-titulo">🏆 Meus desafios</p>
            <div className="perfil-evolucao-lista">
              {(() => {
                // PR por tipo de desafio (nome do desafio como chave)
                const prPorDesafio = {};
                evolucao.forEach(e => {
                  const v = parseFloat(e.valor) || 0;
                  if (!prPorDesafio[e.desafio] || v > prPorDesafio[e.desafio]) {
                    prPorDesafio[e.desafio] = v;
                  }
                });

                return [...evolucao].reverse().slice(0, 10).map((e, i) => {
                  const d     = new Date(e.data + "T12:00:00");
                  const label = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
                  const isPR  = (parseFloat(e.valor) || 0) === prPorDesafio[e.desafio];
                  return (
                    <div key={i} className="perfil-evolucao-item">
                      <span className="perfil-evolucao-data">{label}</span>
                      <span className="perfil-evolucao-desafio">{e.desafio}</span>
                      <span className="perfil-evolucao-valor">
                        {e.valor} reps
                        {isPR && <span className="perfil-pr-badge">PR</span>}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* ── Instalar app ── */}
        {!_standalone && _isIOSSafari && (
          <div className="perfil-section perfil-install-card">
            <span className="perfil-install-icon">📲</span>
            <div className="perfil-install-texto">
              <p className="perfil-install-titulo">Instalar no iPhone</p>
              <p className="perfil-install-sub">
                Toque em <strong>⬆</strong> e depois <strong>"Adicionar à Tela de Início"</strong> para usar o app sem o navegador.
              </p>
            </div>
          </div>
        )}

        {!_standalone && installPrompt && (
          <div className="perfil-section perfil-install-card">
            <span className="perfil-install-icon">📲</span>
            <div className="perfil-install-texto">
              <p className="perfil-install-titulo">Instalar o app</p>
              <p className="perfil-install-sub">Adicione à tela inicial para acesso rápido.</p>
            </div>
            <button className="perfil-install-btn" onClick={async () => {
              installPrompt.prompt();
              await installPrompt.userChoice;
              clearPrompt();
            }}>
              Instalar
            </button>
          </div>
        )}

        {/* ── Trocar conta ── */}
        <button className="perfil-danger-btn" onClick={onTrocarNome}>
          Trocar de conta
        </button>

      </main>
    </div>
  );
}
