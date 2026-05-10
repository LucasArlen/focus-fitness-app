import { useEffect, useRef, useState } from "react";
import { postTreino, getTreinoPorData } from "../api/treino";
import { getHistorico, getTreino } from "../api/ranking";
import { getBanco } from "../api/banco";

function fmtData(data) {
  const [a, m, d] = data.split("-");
  return new Date(Number(a), Number(m) - 1, Number(d))
    .toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

let nextId = 1000;
const uid = () => ++nextId;
const novoBloco = () => ({ id: uid(), nome: "", sugestao: false, linhas: [] });
const novaLinha = () => ({ id: uid(), exercicio: "", serie: "", dropset: false, video_url: "" });

function apiParaEstado(treino) {
  return {
    blocos: treino.blocos.map(b => ({
      id: uid(), nome: b.nome, sugestao: b.sugestao,
      linhas: b.linhas.map(l => ({ id: uid(), exercicio: l.exercicio, serie: l.serie, dropset: l.dropset, video_url: l.video_url || "" })),
    })),
    desafioNome: treino.desafio?.nome || "",
  };
}

const hoje = new Date().toISOString().split("T")[0];

export default function Admin({ onLogout, onVoltar }) {
  const [blocos, setBlocos]           = useState([novoBloco()]);
  const [desafioNome, setDesafioNome] = useState("");
  const [banco, setBanco]             = useState([]);
  const [salvando, setSalvando]       = useState(false);
  const [msg, setMsg]                 = useState(null);
  const [temTreino, setTemTreino]     = useState(false);
  const [dataSel, setDataSel]         = useState(hoje);
  const [pickerAberto,   setPickerAberto]   = useState(false);
  const [pickerItens,    setPickerItens]    = useState([]);
  const [pickerLoad,     setPickerLoad]     = useState(false);
  const pickerRef = useRef(null);

  function carregarData(data) {
    setBlocos([novoBloco()]); setDesafioNome(""); setTemTreino(false); setMsg(null);
    getTreinoPorData(data)
      .then(t => { const { blocos: b, desafioNome: d } = apiParaEstado(t); setBlocos(b); setDesafioNome(d); setTemTreino(true); })
      .catch(() => {});
  }

  useEffect(() => {
    getBanco().then(b => setBanco(b.map(e => e.nome))).catch(() => {});
    carregarData(hoje);
  }, []);

  /* ── Blocos ── */
  const addBloco    = () => setBlocos(p => [...p, novoBloco()]);
  const removeBloco = id => setBlocos(p => p.filter(b => b.id !== id));
  const updateBloco = (id, campo, val) => setBlocos(p => p.map(b => b.id === id ? { ...b, [campo]: val } : b));
  const moverBloco  = (id, dir) => setBlocos(p => {
    const idx = p.findIndex(b => b.id === id), arr = [...p], alvo = idx + dir;
    if (alvo < 0 || alvo >= arr.length) return p;
    [arr[idx], arr[alvo]] = [arr[alvo], arr[idx]]; return arr;
  });

  /* ── Linhas ── */
  const addLinha    = bid => setBlocos(p => p.map(b => b.id === bid ? { ...b, linhas: [...b.linhas, novaLinha()] } : b));
  const removeLinha = (bid, lid) => setBlocos(p => p.map(b => b.id === bid ? { ...b, linhas: b.linhas.filter(l => l.id !== lid) } : b));
  const updateLinha = (bid, lid, campo, val) => setBlocos(p => p.map(b =>
    b.id === bid ? { ...b, linhas: b.linhas.map(l => l.id === lid ? { ...l, [campo]: val } : l) } : b
  ));

  /* ── Picker de treinos anteriores ── */
  async function abrirPicker() {
    if (pickerAberto) { setPickerAberto(false); return; }
    setPickerAberto(true);
    if (pickerItens.length > 0) return; // já carregado
    setPickerLoad(true);
    try {
      const hist = await getHistorico();
      const hoje = new Date().toISOString().split("T")[0];
      setPickerItens(hist.filter(t => t.data !== hoje).slice(0, 5));
    } catch { /* silencioso */ }
    finally { setPickerLoad(false); }
  }

  async function carregarTreino(id) {
    setPickerAberto(false);
    try {
      const treino = await getTreino(id);
      const { blocos: b, desafioNome: d } = apiParaEstado(treino);
      setBlocos(b); setDesafioNome(d);
      setMsg({ tipo: "ok", texto: "Treino carregado. Edite e publique." });
    } catch { setMsg({ tipo: "erro", texto: "Erro ao carregar treino." }); }
  }

  /* ── Publicar ── */
  async function publicar() {
    const blocosValidos = blocos.filter(b => b.nome.trim());
    if (!blocosValidos.length) { setMsg({ tipo: "erro", texto: "Adicione pelo menos um bloco com nome." }); return; }
    setSalvando(true); setMsg(null);
    try {
      await postTreino({
        blocos: blocosValidos.map(b => ({
          nome: b.nome.trim(), sugestao: b.sugestao,
          linhas: b.linhas.filter(l => l.exercicio.trim()).map(l => ({
            exercicio: l.exercicio.trim(), serie: l.serie.trim(), dropset: l.dropset,
            video_url: l.video_url?.trim() || null,
          })),
        })),
        desafio_nome: desafioNome.trim(),
        data: dataSel,
      });
      setTemTreino(true);
      const ehHoje = dataSel === hoje;
      setMsg({ tipo: "ok", texto: temTreino
        ? (ehHoje ? "Treino de hoje atualizado!" : "Treino atualizado!")
        : (ehHoje ? "Treino publicado! Alunos já podem ver." : `Treino de ${fmtData(dataSel)} agendado!`) });
      getBanco().then(b => setBanco(b.map(e => e.nome))).catch(() => {});
    } catch (err) {
      setMsg({ tipo: "erro", texto: err.message });
    } finally { setSalvando(false); }
  }

  return (
    <div className="page">
      <header className="app-header">
        <span className="logo">Focus Fitness</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {onVoltar && (
            <button className="btn-logout" onClick={onVoltar}>← Voltar</button>
          )}
          <button className="btn-logout" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <main className="feed">
        <div className="admin-toolbar">
          <input
            type="date"
            className="date-sel"
            value={dataSel}
            onChange={e => { setDataSel(e.target.value); carregarData(e.target.value); }}
          />
          {temTreino && <span className="date-sel-badge">✓ Treino salvo</span>}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative" }} ref={pickerRef}>
              <button
                className={`btn-icon ${pickerAberto ? "ativo" : ""}`}
                title="Carregar treino anterior"
                onClick={abrirPicker}
              >⎘</button>
              {pickerAberto && (
                <div className="treino-picker">
                  {pickerLoad && <p className="treino-picker-vazio">Carregando...</p>}
                  {!pickerLoad && pickerItens.length === 0 && (
                    <p className="treino-picker-vazio">Nenhum treino anterior.</p>
                  )}
                  {pickerItens.map(t => (
                    <button key={t.id} className="treino-picker-item" onClick={() => carregarTreino(t.id)}>
                      <span className="treino-picker-data">{fmtData(t.data)}</span>
                      <span className="treino-picker-info">
                        {t.total_blocos} blocos · {t.total_exercicios} ex.
                        {t.desafio_nome ? ` · 🏆` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn-publicar" onClick={publicar} disabled={salvando}>
              {salvando ? "Salvando..." : temTreino ? "Atualizar" : "Publicar"}
            </button>
          </div>
        </div>

        {msg && (
          <p className={msg.tipo === "ok" ? "msg-ok" : "login-erro"}>{msg.texto}</p>
        )}

        {/* Datalist para autocomplete */}
        <datalist id="banco">
          {banco.map(nome => <option key={nome} value={nome} />)}
        </datalist>

        {blocos.map((bloco, idx) => (
          <div key={bloco.id} className={`bloco-card admin-bloco ${bloco.sugestao ? "sugestao-card" : ""}`}>
            <div className="admin-bloco-header">
              <input className="input-bloco-nome" placeholder="Nome do bloco…"
                value={bloco.nome} onChange={e => updateBloco(bloco.id, "nome", e.target.value)} />
              <div className="admin-bloco-actions">
                <button className="btn-icon" onClick={() => moverBloco(bloco.id, -1)} disabled={idx === 0}>↑</button>
                <button className="btn-icon" onClick={() => moverBloco(bloco.id, 1)} disabled={idx === blocos.length - 1}>↓</button>
                <button className="btn-icon danger" onClick={() => removeBloco(bloco.id)}>✕</button>
              </div>
            </div>

            <label className="toggle-sugestao">
              <input type="checkbox" checked={bloco.sugestao}
                onChange={e => updateBloco(bloco.id, "sugestao", e.target.checked)} />
              <span>Bloco de sugestão (colapsável)</span>
            </label>

            <div className="admin-linhas">
              {bloco.linhas.map(linha => (
                <div key={linha.id} className="admin-linha-wrap">
                  <div className="admin-linha">
                    <input list="banco" className="input-exercicio" placeholder="Exercício"
                      value={linha.exercicio} onChange={e => updateLinha(bloco.id, linha.id, "exercicio", e.target.value)} />
                    <input className="input-serie" placeholder="Série"
                      value={linha.serie} onChange={e => updateLinha(bloco.id, linha.id, "serie", e.target.value)} />
                    <label className="ds-toggle" title="Drop Set">
                      <input type="checkbox" checked={linha.dropset}
                        onChange={e => updateLinha(bloco.id, linha.id, "dropset", e.target.checked)} />
                      <span className={`ds-label ${linha.dropset ? "ativo" : ""}`}>DS</span>
                    </label>
                    <button
                      className={`btn-icon video-toggle ${linha.video_url ? "tem-video" : ""}`}
                      title="Vídeo de demonstração"
                      onClick={() => updateLinha(bloco.id, linha.id, "_videoAberto", !linha._videoAberto)}
                    >🎬</button>
                    <button className="btn-icon danger" onClick={() => removeLinha(bloco.id, linha.id)}>✕</button>
                  </div>
                  {linha._videoAberto && (
                    <input
                      className="input-video-url"
                      placeholder="URL do vídeo (YouTube, etc.)"
                      value={linha.video_url}
                      onChange={e => updateLinha(bloco.id, linha.id, "video_url", e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
              ))}
              <button className="btn-add-linha" onClick={() => addLinha(bloco.id)}>+ exercício</button>
            </div>
          </div>
        ))}

        <button className="btn-add-bloco" onClick={addBloco}>+ Novo bloco</button>

        <div className="bloco-card admin-desafio">
          <div className="bloco-header">
            <div className="bloco-accent" />
            <span className="bloco-nome">🏆 Desafio do Dia</span>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <input list="banco" className="input-desafio" placeholder="Ex: Agachamento c/ Salto — max repetições"
              value={desafioNome} onChange={e => setDesafioNome(e.target.value)} />
            <p className="desafio-hint">Pontuações são lançadas na aba Desafio após publicar.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
