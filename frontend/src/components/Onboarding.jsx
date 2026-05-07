import { useState } from "react";

export default function Onboarding({ onConfirm }) {
  const [nome, setNome] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (nome.trim().length < 2) return;
    onConfirm(nome.trim());
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-inner">
        <div className="onboarding-logo">Focus Fitness</div>

        <div className="onboarding-body">
          <span className="onboarding-icon">👋</span>
          <h1 className="onboarding-titulo">Bem-vindo!</h1>
          <p className="onboarding-sub">
            Como você quer ser chamado no ranking?
          </p>

          <form className="onboarding-form" onSubmit={handleSubmit}>
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
            <button
              className="btn-publicar onboarding-btn"
              type="submit"
              disabled={nome.trim().length < 2}
            >
              Entrar
            </button>
          </form>

          <p className="onboarding-hint">
            Seu nome aparece no ranking dos desafios.
            <br />Você pode mudar depois.
          </p>
        </div>
      </div>
    </div>
  );
}
