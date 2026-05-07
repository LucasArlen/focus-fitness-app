import { useRef, useState } from "react";
import { cadastrarAluno, loginAluno } from "../api/aluno";

/** Lê ?c= da URL e limpa o parâmetro sem recarregar a página. */
function lerCodigoConvite() {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get("c") || "";
  if (code) {
    // Remove da URL sem reload
    params.delete("c");
    const nova = window.location.pathname + (params.toString() ? "?" + params : "");
    window.history.replaceState({}, "", nova);
    localStorage.setItem("invite_code", code);
  }
  return code || localStorage.getItem("invite_code") || "";
}

export default function Onboarding({ onConfirm, onAdmin }) {
  const [passo, setPasso]     = useState(1); // 1 = nome, 2 = pin
  const [nome, setNome]       = useState("");
  const [pin, setPin]         = useState(["", "", "", ""]);
  const [erro, setErro]       = useState("");
  const [salvando, setSalvando] = useState(false);
  const inputsRef = useRef([]);

  const inviteCode    = lerCodigoConvite();
  const adminTimer    = useRef(null);

  // Segurar o logo 1.5s → abre login de admin
  function logoStart(e) {
    e.preventDefault();
    adminTimer.current = setTimeout(() => onAdmin?.(), 1500);
  }
  function logoEnd() {
    clearTimeout(adminTimer.current);
  }

  /* ── Passo 1: confirma nome ── */
  function handleNome(e) {
    e.preventDefault();
    if (nome.trim().length < 2) return;
    setErro("");
    setPasso(2);
    setTimeout(() => inputsRef.current[0]?.focus(), 80);
  }

  /* ── Passo 2: gerencia os 4 campos do PIN ── */
  function handleDigit(i, val) {
    if (!/^\d?$/.test(val)) return;
    const novo = [...pin];
    novo[i] = val;
    setPin(novo);
    if (val && i < 3) inputsRef.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !pin[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  }

  /* ── Submete PIN ── */
  async function handlePin(e) {
    e.preventDefault();
    const codigo = pin.join("");
    if (codigo.length < 4) return;
    setSalvando(true);
    setErro("");
    try {
      let res;
      try {
        // Tenta cadastrar (envia invite_code — ignorado se já existe)
        res = await cadastrarAluno(nome.trim(), codigo, inviteCode);
      } catch (err) {
        if (err.message.includes("já cadastrado")) {
          // Aluno existente: login não precisa de código
          res = await loginAluno(nome.trim(), codigo);
        } else {
          throw err;
        }
      }
      // Persiste o código para futuros acessos neste device
      if (inviteCode) localStorage.setItem("invite_code", inviteCode);
      onConfirm(nome.trim(), res.access_token);
    } catch (err) {
      const msg = err.message;
      if (msg.includes("convite") || msg.includes("QR")) {
        setErro("Escaneie o QR code da academia para criar sua conta.");
      } else if (msg.includes("PIN") || msg.includes("inválido")) {
        setErro("PIN incorreto. Tenta de novo.");
      } else {
        setErro(msg);
      }
      setPin(["", "", "", ""]);
      setTimeout(() => inputsRef.current[0]?.focus(), 80);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-inner">
        <div
          className="onboarding-logo"
          onMouseDown={logoStart}
          onMouseUp={logoEnd}
          onMouseLeave={logoEnd}
          onTouchStart={logoStart}
          onTouchEnd={logoEnd}
          style={{ userSelect: "none" }}
        >Focus Fitness</div>

        {/* ── PASSO 1: NOME ── */}
        {passo === 1 && (
          <div className="onboarding-body">
            <span className="onboarding-icon">👋</span>
            <h1 className="onboarding-titulo">Bem-vindo!</h1>
            <p className="onboarding-sub">Como você quer ser chamado no ranking?</p>

            <form className="onboarding-form" onSubmit={handleNome}>
              <input
                className="onboarding-input"
                placeholder="Seu nome"
                value={nome}
                onChange={e => setNome(e.target.value)}
                autoFocus
                maxLength={40}
                autoComplete="off"
                autoCapitalize="words"
              />
              <button className="btn-publicar onboarding-btn" type="submit"
                disabled={nome.trim().length < 2}>
                Continuar →
              </button>
            </form>
          </div>
        )}

        {/* ── PASSO 2: PIN ── */}
        {passo === 2 && (
          <div className="onboarding-body">
            <span className="onboarding-icon">🔐</span>
            <h1 className="onboarding-titulo">{nome}</h1>
            <p className="onboarding-sub">
              Crie um PIN de 4 dígitos.<br />
              Ele te identifica em qualquer celular.
            </p>

            <form className="onboarding-form" onSubmit={handlePin}>
              <div className="pin-grid">
                {pin.map((d, i) => (
                  <input
                    key={i}
                    ref={el => inputsRef.current[i] = el}
                    className={`pin-box ${d ? "preenchido" : ""}`}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    autoComplete="off"
                  />
                ))}
              </div>

              {erro && <p className="onboarding-erro">{erro}</p>}

              <button className="btn-publicar onboarding-btn" type="submit"
                disabled={pin.join("").length < 4 || salvando}>
                {salvando ? "Entrando..." : "Entrar"}
              </button>

              <button type="button" className="onboarding-voltar"
                onClick={() => { setPasso(1); setErro(""); setPin(["","","",""]); }}>
                ← Trocar nome
              </button>
            </form>
          </div>
        )}

        <p className="onboarding-hint">
          {passo === 1
            ? "Seu nome aparece no ranking dos desafios."
            : "Se já tem conta, use o mesmo PIN de sempre."}
        </p>
      </div>
    </div>
  );
}
