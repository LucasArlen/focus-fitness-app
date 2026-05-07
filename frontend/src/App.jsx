import { useState } from "react";
import Hoje from "./pages/Hoje";
import Admin from "./pages/Admin";
import AdminDesafio from "./pages/AdminDesafio";
import Login from "./pages/Login";

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

  return (
    <>
      {view === "treino" && <Hoje />}

      {view === "admin" && (
        isAdmin
          ? <Admin onLogout={onLogout} />
          : <Login onLogin={onLogin} />
      )}

      {view === "desafio" && <AdminDesafio isAdmin={isAdmin} />}

      <nav className="bottom-nav">
        {[
          { id: "treino", label: "Treino" },
          { id: "admin",  label: isAdmin ? "Admin ✓" : "Admin" },
          { id: "desafio", label: "Desafio" },
        ].map(v => (
          <button
            key={v.id}
            className={`nav-btn ${view === v.id ? "ativo" : ""}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>
    </>
  );
}
