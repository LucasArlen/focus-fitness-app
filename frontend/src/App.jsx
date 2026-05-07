import { useRef, useState } from "react";
import Hoje from "./pages/Hoje";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDesafio from "./pages/AdminDesafio";
import Historico from "./pages/Historico";
import Login from "./pages/Login";
import Onboarding from "./components/Onboarding";
import { useAluno, freqMes } from "./hooks/useAluno";

const IconTreino = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 3H4v2h16V3zm0 4H4v2h16V7zm0 4H4v2h16v-2zm0 4H4v2h16v-2zm0 4H4v2h16v-2z"/>
  </svg>
);

const IconAdmin = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>
);

const IconDesafio = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 5h-2V3H7v2H5C3.9 5 3 5.9 3 7v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 16.9V19H7v2h10v-2h-4v-2.1a5.01 5.01 0 003.61-2.96C19.08 13.63 21 11.55 21 9V7c0-1.1-.9-2-2-2zm-2 4a3 3 0 01-3 3V7h3v2zM5 9V7h3v3a3 3 0 01-3-3z"/>
  </svg>
);

const IconHistorico = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 117 7c-1.93 0-3.68-.79-4.94-2.06L6.64 18.36A8.955 8.955 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
  </svg>
);

export default function App() {
  const [view, setView]           = useState("treino");
  const [adminView, setAdminView] = useState("dashboard");
  const [role, setRole]           = useState(() => localStorage.getItem("role") || "guest");
  const { nome, salvar, limpar }  = useAluno();
  const pressTimer                = useRef(null);

  const isAdmin = role === "admin";

  function onLogin(newRole) {
    setRole(newRole);
    setView("admin");
    setAdminView("dashboard");
  }

  function onLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setRole("guest");
    setView("treino");
    setAdminView("dashboard");
  }

  // Segurar o logo 1.5s → abre login admin
  function logoStart(e) {
    e.preventDefault(); // bloqueia seleção de texto no mobile
    pressTimer.current = setTimeout(() => setView("admin"), 1500);
  }
  function logoEnd() {
    clearTimeout(pressTimer.current);
  }

  // Onboarding: só para não-admins sem nome salvo e sem intenção de acessar o admin
  // onAdmin: gesto de segurar logo → muda view para "admin" e sai do onboarding
  if (!isAdmin && !nome && view !== "admin") {
    return (
      <Onboarding
        onConfirm={(n, token) => salvar(n, token)}
        onAdmin={() => setView("admin")}
      />
    );
  }

  // Abas: admin só aparece na nav se já estiver logado como admin
  const TABS = [
    { id: "treino",    label: "Treino",    Icon: IconTreino },
    { id: "desafio",   label: "Desafio",   Icon: IconDesafio },
    { id: "historico", label: "Histórico", Icon: IconHistorico },
    ...(isAdmin ? [{ id: "admin", label: "Admin ✓", Icon: IconAdmin }] : []),
  ];

  return (
    <>
      {view === "treino"    && (
        <Hoje nomeAluno={nome} onLogoStart={logoStart} onLogoEnd={logoEnd} />
      )}
      {view === "admin"     && !isAdmin && <Login onLogin={onLogin} />}
      {view === "admin"     && isAdmin  && adminView === "dashboard" && (
        <AdminDashboard
          onEditarTreino={() => setAdminView("editor")}
          onLogout={onLogout}
        />
      )}
      {view === "admin"     && isAdmin  && adminView === "editor" && (
        <Admin
          onLogout={onLogout}
          onVoltar={() => setAdminView("dashboard")}
        />
      )}
      {view === "desafio"   && <AdminDesafio isAdmin={isAdmin} nomeAluno={nome} freqMes={freqMes()} />}
      {view === "historico" && <Historico nomeAluno={nome} onTrocarNome={limpar} />}

      <nav className="bottom-nav">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-btn ${view === id ? "ativo" : ""}`}
            onClick={() => setView(id)}
          >
            <Icon />
            <span>{label}</span>
            <span className="nav-dot" />
          </button>
        ))}
      </nav>
    </>
  );
}
