import { useEffect, useState } from "react";

const DISMISSED_KEY = "install_banner_dismissed";

function jaDismissed() {
  return !!localStorage.getItem(DISMISSED_KEY);
}
function dismiss() {
  localStorage.setItem(DISMISSED_KEY, "1");
}

const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
// Safari puro no iOS (sem Chrome, Firefox ou outros wrappers)
const isIOSSafari =
  isIOS &&
  /safari/i.test(navigator.userAgent) &&
  !/crios|fxios|opios|mercury/i.test(navigator.userAgent);

export default function InstallBanner() {
  // Android: guarda o evento beforeinstallprompt
  const [promptEvt, setPromptEvt] = useState(null);
  // iOS: mostra banner de instrução manual
  const [mostrarIOS, setMostrarIOS] = useState(false);

  useEffect(() => {
    if (isStandalone || jaDismissed()) return;

    if (isIOSSafari) {
      // Pequeno delay para não aparecer logo na abertura
      const t = setTimeout(() => setMostrarIOS(true), 3000);
      return () => clearTimeout(t);
    }

    function handler(e) {
      e.preventDefault();
      setPromptEvt(e);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ── Android ─────────────────────────────────────────────────────
  if (promptEvt) {
    return (
      <div className="install-banner">
        <span className="install-banner-icon">📲</span>
        <span className="install-banner-texto">Instale o app na tela início</span>
        <button
          className="install-banner-btn"
          onClick={async () => {
            promptEvt.prompt();
            const { outcome } = await promptEvt.userChoice;
            if (outcome === "accepted" || outcome === "dismissed") {
              dismiss();
              setPromptEvt(null);
            }
          }}
        >
          Instalar
        </button>
        <button
          className="install-banner-fechar"
          aria-label="Fechar"
          onClick={() => { dismiss(); setPromptEvt(null); }}
        >
          ✕
        </button>
      </div>
    );
  }

  // ── iOS Safari ──────────────────────────────────────────────────
  if (mostrarIOS) {
    return (
      <div className="install-banner install-banner-ios">
        <span className="install-banner-icon">📲</span>
        <div className="install-banner-ios-texto">
          <span>Instale o app:</span>
          <span>toque em <strong>⬆</strong> e depois <strong>"Adicionar à Tela de Início"</strong></span>
        </div>
        <button
          className="install-banner-fechar"
          aria-label="Fechar"
          onClick={() => { dismiss(); setMostrarIOS(false); }}
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}
