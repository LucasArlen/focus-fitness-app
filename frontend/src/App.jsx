import { useRef, useState } from "react";
import Hoje from "./pages/Hoje";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDesafio from "./pages/AdminDesafio";
import AdminAlunos from "./pages/AdminAlunos";
import AdminModoAula from "./pages/AdminModoAula";
import Historico from "./pages/Historico";
import Login from "./pages/Login";
import Onboarding from "./components/Onboarding";
import InstallBanner from "./components/InstallBanner";
import Perfil from "./pages/Perfil";
import Avisos from "./pages/Avisos";
import Inicio from "./pages/Inicio";
import { useAluno, freqMes } from "./hooks/useAluno";

const IconInicio = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);

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

const IconAvisos = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 17v-6c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v6H4v2h16v-2h-2zm-2 0H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6zm-4 5c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z"/>
  </svg>
);

const IconPerfil = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
  </svg>
);

export default function App() {
  const [view, setView]           = useState(() =>
    localStorage.getItem("role") === "admin" ? "admin" : "inicio"
  );
  const [adminView, setAdminView] = useState("dashboard");
  const [role, setRole]           = useState(() => localStorage.getItem("role") || "guest");
  const { nome, apelido, displayNome, salvar, salvarApelido, limpar } = useAluno();
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
    setView("inicio");
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
  const TABS = isAdmin
    ? [
        { id: "admin",   label: "Painel",   Icon: IconAdmin },
        { id: "avisos",  label: "Avisos",   Icon: IconAvisos },
        { id: "desafio", label: "Desafio",  Icon: IconDesafio },
      ]
    : [
        { id: "treino",    label: "Treino",    Icon: IconTreino },
        { id: "desafio",   label: "Desafio",   Icon: IconDesafio },
        { id: "inicio",    label: "Início",    Icon: IconInicio },
        { id: "avisos",    label: "Avisos",    Icon: IconAvisos },
        { id: "historico", label: "Histórico", Icon: IconHistorico },
      ];

  return (
    <>
      {view === "inicio" && !isAdmin && (
        <Inicio
          nome={nome}
          apelido={apelido}
          onVerTreino={() => setView("treino")}
          onVerAvisos={() => setView("avisos")}
          onVerPerfil={() => setView("perfil")}
          onLogoStart={logoStart}
          onLogoEnd={logoEnd}
        />
      )}
      {view === "treino"    && (
        <Hoje nomeAluno={nome} onLogoStart={logoStart} onLogoEnd={logoEnd} onVerDesafio={() => setView("desafio")} />
      )}
      {view === "admin"     && !isAdmin && <Login onLogin={onLogin} />}
      {view === "admin"     && isAdmin  && adminView === "dashboard" && (
        <AdminDashboard
          onEditarTreino={() => setAdminView("editor")}
          onVerAlunos={() => setAdminView("alunos")}
          onModoAula={() => setAdminView("modoaula")}
          onLogout={onLogout}
        />
      )}
      {view === "admin"     && isAdmin  && adminView === "editor" && (
        <Admin
          onLogout={onLogout}
          onVoltar={() => setAdminView("dashboard")}
        />
      )}
      {view === "admin"     && isAdmin  && adminView === "alunos" && (
        <AdminAlunos
          onVoltar={() => setAdminView("dashboard")}
        />
      )}
      {view === "admin"     && isAdmin  && adminView === "modoaula" && (
        <AdminModoAula
          onVoltar={() => setAdminView("dashboard")}
          onVerAlunos={() => setAdminView("alunos")}
        />
      )}
      {view === "avisos"    && <Avisos isAdmin={isAdmin} nomeAluno={nome} onLogoStart={logoStart} onLogoEnd={logoEnd} />}
      {view === "desafio"   && <AdminDesafio isAdmin={isAdmin} nomeAluno={nome} freqMes={freqMes()} onLogoStart={logoStart} onLogoEnd={logoEnd} />}
      {view === "historico" && <Historico nomeAluno={nome} onLogoStart={logoStart} onLogoEnd={logoEnd} />}
      {view === "perfil" && !isAdmin && (
        <Perfil
          nome={nome}
          apelido={apelido}
          onSalvarApelido={salvarApelido}
          onTrocarNome={limpar}
          onLogoStart={logoStart}
          onLogoEnd={logoEnd}
        />
      )}

      {!isAdmin && <InstallBanner />}

      <nav className="bottom-nav">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-btn ${view === id ? "ativo" : ""}`}
            onClick={() => { setView(id); if (id === "admin") setAdminView("dashboard"); }}
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
