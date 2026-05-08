import { useCallback, useRef, useState } from "react";
import { cadastrarAluno, loginAluno } from "../api/aluno";
import QrScanner from "./QrScanner";

/** Lê ?c= da URL e limpa o parâmetro sem recarregar a página. */
function lerCodigoConvite() {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get("c") || "";
  if (code) {
    params.delete("c");
    const nova = window.location.pathname + (params.toString() ? "?" + params : "");
    window.history.replaceState({}, "", nova);
    localStorage.setItem("invite_code", code);
  }
  return code || localStorage.getItem("invite_code") || "";
}

/** PIN automático por device — gerado uma vez e guardado. */
function obterPinLocal() {
  let pin = localStorage.getItem("device_pin");
  if (!pin) {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
    localStorage.setItem("device_pin", pin);
  }
  return pin;
}

export default function Onboarding({ onConfirm, onAdmin }) {
  const [nome, setNome]               = useState("");
  const [codigoDigitado, setCodigoDig]= useState("");
  const [erro, setErro]               = useState("");
  const [salvando, setSalvando]       = useState(false);
  const [qrAberto, setQrAberto]       = useState(false);
  const [inviteCode, setInviteCode]   = useState(() => lerCodigoConvite());
  const [mostrarCodigo, setMostrarCodigo] = useState(false);
  const adminTimer = useRef(null);

  // Código efetivo: QR escaneado / link > digitado manualmente
  const codigoEfetivo = inviteCode || codigoDigitado.trim();

  const handleScan = useCallback((texto) => {
    setQrAberto(false);
    try {
      const url  = new URL(texto);
      const code = url.searchParams.get("c");
      if (code) {
        localStorage.setItem("invite_code", code);
        setInviteCode(code);
      }
    } catch { /* não era URL válida */ }
  }, []);

  function logoStart(e) {
    e.preventDefault();
    adminTimer.current = setTimeout(() => onAdmin?.(), 1500);
  }
  function logoEnd() { clearTimeout(adminTimer.current); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (nome.trim().length < 2) return;
    if (!codigoEfetivo) {
      setErro("Escaneie o QR code, use o link ou digite o código da academia.");
      return;
    }

    const pin = obterPinLocal();
    setSalvando(true);
    setErro("");
    try {
      let res;
      try {
        // Tenta cadastrar (se já existe + convite válido → backend reseta PIN)
        res = await cadastrarAluno(nome.trim(), pin, codigoEfetivo);
      } catch (err) {
        if (err.message.includes("já cadastrado")) {
          // Device já tem o PIN correto, faz login direto
          res = await loginAluno(nome.trim(), pin);
        } else {
          throw err;
        }
      }
      localStorage.setItem("invite_code", codigoEfetivo);
      onConfirm(nome.trim(), res.access_token);
    } catch (err) {
      const msg = err.message;
      if (msg.includes("convite") || msg.includes("QR") || msg.includes("inválido")) {
        setErro("Código inválido. Peça o link ou código ao instrutor.");
      } else if (msg.includes("PIN") || msg.includes("Nome ou PIN")) {
        setErro("Não foi possível entrar. Tente o botão abaixo para limpar e recomeçar.");
      } else {
        setErro(msg);
      }
    } finally {
      setSalvando(false);
    }
  }

  if (qrAberto) {
    return <QrScanner onScan={handleScan} onClose={() => setQrAberto(false)} />;
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-inner">
        <div
          className="onboarding-logo"
          onMouseDown={logoStart} onMouseUp={logoEnd}
          onMouseLeave={logoEnd} onTouchStart={logoStart} onTouchEnd={logoEnd}
          style={{ userSelect: "none" }}
        >Focus Fitness</div>

        <div className="onboarding-body">
          <span className="onboarding-icon">👋</span>
          <h1 className="onboarding-titulo">Bem-vindo!</h1>
          <p className="onboarding-sub">Como você quer ser chamado no ranking?</p>

          <form className="onboarding-form" onSubmit={handleSubmit}>
            {/* Nome */}
            <input
              className="onboarding-input"
              placeholder="Seu nome completo"
              value={nome}
              onChange={e => setNome(e.target.value)}
              autoFocus
              maxLength={40}
              autoComplete="off"
              autoCapitalize="words"
            />

            {/* Código de acesso */}
            <div className="onboarding-codigo-wrap">
              {inviteCode ? (
                <div className="onboarding-codigo-ok">
                  <span>✅ Código de acesso confirmado</span>
                  <button type="button" className="onboarding-trocar-codigo"
                    onClick={() => { setInviteCode(""); localStorage.removeItem("invite_code"); }}>
                    Trocar
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="onboarding-qr-btn"
                    onClick={() => setQrAberto(true)}
                  >
                    📷  Escanear QR code
                  </button>

                  <div className="onboarding-ou">
                    <span />ou<span />
                  </div>

                  <input
                    className="onboarding-input onboarding-codigo-input"
                    placeholder="Digitar código manualmente"
                    value={codigoDigitado}
                    onChange={e => setCodigoDig(e.target.value.trim())}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </>
              )}
            </div>

            {erro && <p className="onboarding-erro">{erro}</p>}

            <button
              className="btn-publicar onboarding-btn"
              type="submit"
              disabled={nome.trim().length < 2 || !codigoEfetivo || salvando}
            >
              {salvando ? "Entrando..." : "Entrar →"}
            </button>
          </form>
        </div>

        <p className="onboarding-hint">Seu nome aparece no ranking dos desafios.</p>
      </div>
    </div>
  );
}
