import { useState } from "react";
import { postTreino, getTreinoHoje } from "../api/treino";

let nextId = 1000;
const uid = () => ++nextId;
const novoBloco = () => ({ id: uid(), nome: "", sugestao: false, linhas: [] });
const novaLinha = () => ({ id: uid(), exercicio: "", serie: "", dropset: false });

function treinoParaEstado(treino) {
  return {
    blocos: treino.blocos.map(b => ({
      id: uid(),
      nome: b.nome,
      sugestao: b.sugestao,
      linhas: b.linhas.map(l => ({ id: uid(), exercicio: l.exercicio, serie: l.serie, dropset: l.dropset })),
    })),
    desafioNome: treino.desafio?.nome || "",
  };
}

export default function Admin({ onLogout }) {
  const [blocos, setBlocos] = useState([novoBloco()]);
  const [desafioNome, setDesafioNome] = useState("");
  const [estado, setEstado] = useState("editando"); // editando | publicando | publicado | erro
  const [erroMsg, setErroMsg] = useState("");

  /* ── Blocos ── */
  const addBloco    = () => setBlocos(p => [...p, novoBloco()]);
  const removeBloco = id => setBlocos(p => p.filter(b => b.id !== id));
  const updateBloco = (id, campo, val) => setBlocos(p => p.map(b => b.id === id ? { ...b, [campo]: val } : b));
  const moverBloco  = (id, dir) => setBlocos(p => {
    const idx = p.findIndex(b => b.id === id), arr = [...p], alvo = idx + dir;
    if (alvo < 0 || alvo >= arr.length) return p;
    [arr[idx], arr[alvo]] = [arr[alvo], arr[idx]];
    return arr;
  });

  /* ── Linhas ── */
  const addLinha    = bid => setBlocos(p => p.map(b => b.id === bid ? { ...b, linhas: [...b.linhas, novaLinha()] } : b));
  const removeLinha = (bid, lid) => setBlocos(p => p.map(b => b.id === bid ? { ...b, linhas: b.linhas.filter(l => l.id !== lid) } : b));
  const updateLinha = (bid, lid, campo, val) => setBlocos(p => p.map(b =>
    b.id === bid ? { ...b, linhas: b.linhas.map(l => l.id === lid ? { ...l, [campo]: val } : l) } : b
  ));

  /* ── Publicar ── */
  async function publicar() {
    const blocosValidos = blocos.filter(b => b.nome.trim());
    if (!blocosValidos.length) { setErroMsg("Adicione pelo menos um bloco com nome."); return; }
    setEstado("publicando"); setErroMsg("");
    try {
      await postTreino({
        blocos: blocosValidos.map(b => ({
          nome: b.nome.trim(), sugestao: b.sugestao,
          linhas: b.linhas.filter(l => l.exercicio.trim()).map(l => ({
            exercicio: l.exercicio.trim(), serie: l.serie.trim(), dropset: l.dropset,
          })),
        })),
        desafio_nome: desafioNome.trim(),
      });
      setEstado("publicado");
    } catch (err) {
      setErroMsg(err.message); setEstado("editando");
    }
  }

  /* ── Editar treino publicado ── */
  async function editarPublicado() {
    try {
      const treino = await getTreinoHoje();
      const { blocos: b, desafioNome: d } = treinoParaEstado(treino);
      setBlocos(b); setDesafioNome(d); setEstado("editando");
    } catch {
      setBlocos([novoBloco()]); setDesafioNome(""); setEstado("editando");
    }
  }

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  /* ── Tela de sucesso ── */
  if (estado === "publicado") return (
    <div className="page">
      <header className="app-header">
        <span className="logo">Focus Fitness</span>
        <button className="btn-logout" onClick={onLogout}>Sair</button>
      </header>
      <main className="feed">
        <div className="bloco-card publicado-card">
          <p className="publicado-icon">✅</p>
          <p className="publicado-titulo">Treino publicado!</p>
          <p className="publicado-sub">Os alunos já podem ver o treino de hoje.</p>
          <p className="publicado-sub">Use a aba <strong>Desafio</strong> para lançar pontuações.</p>
          <button className="btn-add-bloco" onClick={editarPublicado} style={{ marginTop: 20 }}>
            ✏️ Editar treino de hoje
          </button>
        </div>
      </main>
    </div>
  );

  /* ── Builder ── */
  return (
    <div className="page">
      <header className="app-header">
        <span className="logo">Focus Fitness</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="admin-badge">Admin</span>
          <button className="btn-logout" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <main className="feed">
        <div className="admin-toolbar">
          <span className="data-header" style={{ textTransform: "capitalize" }}>{hoje}</span>
          <button className="btn-publicar" onClick={publicar} disabled={estado === "publicando"}>
            {estado === "publicando" ? "Publicando..." : "Publicar"}
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
              <input type="checkbox" checked={bloco.sugestao} onChange={e => updateBloco(bloco.id, "sugestao", e.target.checked)} />
              <span>Bloco de sugestão (colapsável)</span>
            </label>

            <div className="admin-linhas">
              {bloco.linhas.map(linha => (
                <div key={linha.id} className="admin-linha">
                  <input className="input-exercicio" placeholder="Exercício" value={linha.exercicio}
                    onChange={e => updateLinha(bloco.id, linha.id, "exercicio", e.target.value)} />
                  <input className="input-serie" placeholder="Série" value={linha.serie}
                    onChange={e => updateLinha(bloco.id, linha.id, "serie", e.target.value)} />
                  <label className="ds-toggle" title="Drop Set">
                    <input type="checkbox" checked={linha.dropset}
                      onChange={e => updateLinha(bloco.id, linha.id, "dropset", e.target.checked)} />
                    <span className={`ds-label ${linha.dropset ? "ativo" : ""}`}>DS</span>
                  </label>
                  <button className="btn-icon danger" onClick={() => removeLinha(bloco.id, linha.id)}>✕</button>
                </div>
              ))}
              <button className="btn-add-linha" onClick={() => addLinha(bloco.id)}>+ exercício</button>
            </div>
          </div>
        ))}

        <button className="btn-add-bloco" onClick={addBloco}>+ Novo bloco</button>

        <div className="bloco-card admin-desafio">
          <div className="bloco-header">
            <div className="bloco-accent" style={{ background: "#e8c847" }} />
            <span className="bloco-nome">🏆 Desafio do Dia</span>
          </div>
          <div style={{ padding: "12px 14px 0" }}>
            <input className="input-desafio" placeholder="Ex: Agachamento c/ Salto — max repetições"
              value={desafioNome} onChange={e => setDesafioNome(e.target.value)} />
            <p className="desafio-hint" style={{ marginBottom: 12 }}>Pontuações são lançadas na aba Desafio após publicar.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
