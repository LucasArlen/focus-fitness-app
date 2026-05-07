import { useState } from "react";
import Hoje from "./pages/Hoje";
import Admin from "./pages/Admin";
import AdminDesafio from "./pages/AdminDesafio";
import Login from "./pages/Login";

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

export default function App() {
  const [view, setView] = useState("treino");
  const [role, setRole] = useState(() => localStorage.getItem("role") || "guest");

  function onLogin(newRole) {
    setRole(newRole);
    setView("admin");
  }

  function onLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setRole("guest");
    setView("treino");
  }

  const isAdmin = role === "admin";

  const TABS = [
    { id: "treino",  label: "Treino",  Icon: IconTreino },
    { id: "admin",   label: isAdmin ? "Admin ✓" : "Admin", Icon: IconAdmin },
    { id: "desafio", label: "Desafio", Icon: IconDesafio },
  ];

  return (
    <>
      {view === "treino"  && <Hoje />}
      {view === "admin"   && (isAdmin ? <Admin onLogout={onLogout} /> : <Login onLogin={onLogin} />)}
      {view === "desafio" && <AdminDesafio isAdmin={isAdmin} />}

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
