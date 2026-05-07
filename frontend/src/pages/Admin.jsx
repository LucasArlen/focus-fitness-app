import { useState } from "react";
import { postTreino } from "../api/treino";

let nextId = 1000;
const uid = () => ++nextId;
const novoBloco = () => ({ id: uid(), nome: "", sugestao: false, linhas: [] });
const novaLinha = () => ({ id: uid(), exercicio: "", serie: "", dropset: false });

export default function Admin({ onLogout }) {
  const [blocos, setBlocos] = useState([novoBloco()]);
  const [desafioNome, setDesafioNome] = useState("");
  const [estado, setEstado] = useState("editando"); // editando | publicando | publicado | erro
  const [erroMsg, setErroMsg] = useState("");

  /* ── Blocos ── */

  function addBloco() { setBlocos(p => [...p, novoBloco()]); }
  function removeBloco(id) { setBlocos(p => p.filter(b => b.id !== id)); }
  function updateBloco(id, campo, val) {
    setBlocos(p => p.map(b => b.id === id ? { ...b, [campo]: val } : b));
  }
  function moverBloco(id, dir) {
    setBlocos(p => {
      const idx = p.findIndex(b => b.id === id);
      const arr = [...p];
      const alvo = idx + dir;
      if (alvo < 0 || alvo >= arr.length) return p;
      [arr[idx], arr[alvo]] = [arr[alvo], arr[idx]];
      return arr;
    });
  }

  /* ── Linhas ── */

  function addLinha(blocoId) {
    setBlocos(p => p.map(b => b.id === blocoId ? { ...b, linhas: [...b.linhas, novaLinha()] } : b));
  }
  function removeLinha(blocoId, linhaId) {
    setBlocos(p => p.map(b => b.id === blocoId ? { ...b, linhas: b.linhas.filter(l => l.id !== linhaId) } : b));
  }
  function updateLinha(blocoId, linhaId, campo, val) {
    setBlocos(p => p.map(b =>
      b.id === blocoId
        ? { ...b, linhas: b.linhas.map(l => l.id === linhaId ? { ...l, [campo]: val } : l) }
        : b
    ));
  }

  /* ── Publicar ── */

  async function publicar() {
    const blocosValidos = blocos.filter(b => b.nome.trim());
    if (blocosValidos.length === 0) { setErroMsg("Adicione pelo menos um bloco com nome."); return; }
    setEstado("publicando");
    setErroMsg("");
    try {
      await postTreino({
        blocos: blocosValidos.map(b => ({
          nome: b.nome.trim(),
          sugestao: b.sugestao,
          linhas: b.linhas.filter(l => l.exercicio.trim()).map(l => ({
            exercicio: l.exercicio.trim(),
            serie: l.serie.trim(),
            dropset: l.dropset,
          })),
        })),
        desafio_nome: desafioNome.trim(),
      });
      setEstado("publicado");
    } catch (err) {
      setErroMsg(err.message);
      setEstado("editando");
    }
  }

  function novoTreino() {
    setBlocos([novoBloco()]);
    setDesafioNome("");
    setEstado("editando");
  }

  const hoje = new Date().toLocaleDateString("pt-BR");

  if (estado === "publicado") {
    return (
      <div className="page">
        <header className="app-header">
          <span className="logo">Quadro.</span>
          <button className="btn-logout" onClick={onLogout}>Sair</button>
        </header>
        <main className="feed">
          <div className="bloco-card publicado-card">
            <p className="publicado-icon">✓</p>
            <p className="publicado-titulo">Treino publicado!</p>
            <p className="publicado-sub">Os alunos já podem ver o treino de hoje.</p>
            <p className="publicado-sub">Use a aba <strong>Desafio</strong> para lançar pontuações.</p>
            <button className="btn-add-bloco" onClick={novoTreino} style={{ marginTop: 16 }}>
              Substituir treino de hoje
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="app-header">
        <span className="logo">Quadro.</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="admin-badge">Admin</span>
          <button className="btn-logout" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <main className="feed">
        <div className="admin-toolbar">
          <span className="data-header">{hoje}</span>
          <button
            className="btn-publicar"
            onClick={publicar}
            disabled={estado === "publicando"}
          >
            {estado === "publicando" ? "Publicando..." : "Publicar treino"}
          </button>
        </div>

        {erroMsg && <p className="login-erro">{erroMsg}</p>}

        {blocos.map((bloco, idx) => (
          <div key={bloco.id} className={`bloco-card admin-bloco ${bloco.sugestao ? "sugestao-card" : ""}`}>
            <div className="admin-bloco-header">
              <input
                className="input-bloco-nome"
                placeholder="Nome do bloco…"
                value={bloco.nome}
                onChange={e => updateBloco(bloco.id, "nome", e.target.value)}
              />
              <div className="admin-bloco-actions">
                <button className="btn-icon" onClick={() => moverBloco(bloco.id, -1)} disabled={idx === 0}>↑</button>
                <button className="btn-icon" onClick={() => moverBloco(bloco.id, 1)} disabled={idx === blocos.length - 1}>↓</button>
                <button className="btn-icon danger" onClick={() => removeBloco(bloco.id)}>✕</button>
              </div>
            </div>

            <label className="toggle-sugestao">
              <input
                type="checkbox"
                checked={bloco.sugestao}
                onChange={e => updateBloco(bloco.id, "sugestao", e.target.checked)}
              />
              <span>Bloco de sugestão (colapsável)</span>
            </label>

            <div className="admin-linhas">
              {bloco.linhas.map(linha => (
                <div key={linha.id} className="admin-linha">
                  <input
                    className="input-exercicio"
                    placeholder="Exercício"
                    value={linha.exercicio}
                    onChange={e => updateLinha(bloco.id, linha.id, "exercicio", e.target.value)}
                  />
                  <input
                    className="input-serie"
                    placeholder="Série"
                    value={linha.serie}
                    onChange={e => updateLinha(bloco.id, linha.id, "serie", e.target.value)}
                  />
                  <label className="ds-toggle" title="Dropset">
                    <input
                      type="checkbox"
                      checked={linha.dropset}
                      onChange={e => updateLinha(bloco.id, linha.id, "dropset", e.target.checked)}
                    />
                    <span className={`ds-label ${linha.dropset ? "ativo" : ""}`}>DS</span>
                  </label>
                  <button className="btn-icon danger" onClick={() => removeLinha(bloco.id, linha.id)}>✕</button>
                </div>
              ))}
              <button className="btn-add-linha" onClick={() => addLinha(bloco.id)}>
                + Adicionar exercício
              </button>
            </div>
          </div>
        ))}

        <button className="btn-add-bloco" onClick={addBloco}>+ Novo bloco</button>

        <div className="bloco-card desafio-card admin-desafio">
          <h2 className="bloco-nome">🏆 Desafio do Dia</h2>
          <input
            className="input-desafio"
            placeholder="Ex: Agachamento c/ Salto — max repetições"
            value={desafioNome}
            onChange={e => setDesafioNome(e.target.value)}
          />
          <p className="desafio-hint">Pontuações são lançadas na aba Desafio após publicar.</p>
        </div>
      </main>
    </div>
  );
}
