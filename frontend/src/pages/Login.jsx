import { useState } from "react";
import { adminLogin } from "../api/auth";
import { Eye, EyeOff } from "lucide-react";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [verSenha,   setVerSenha]   = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const data = await adminLogin(username, password);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      onLogin(data.role);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="page">
      <header className="app-header">
        <span className="logo">Focus Fitness</span>
      </header>

      <main className="feed">
        <div className="bloco-card login-card">
          <h2 className="bloco-nome">Acesso Admin</h2>
          <form className="login-form" onSubmit={entrar}>
            <input
              className="input-exercicio"
              placeholder="Usuário"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
            <div className="input-senha-wrap">
              <input
                className="input-exercicio"
                type={verSenha ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" className="btn-ver-senha" onClick={() => setVerSenha(v => !v)}>
                {verSenha ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {erro && <p className="login-erro">{erro}</p>}
            <button className="btn-publicar" type="submit" disabled={carregando}>
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
