import { useEffect, useState } from "react";
import { getAvisos, criarAviso, deletarAviso, confirmarAviso } from "../api/aviso";

const CAT_CFG = {
  aviso:   { label: "Aviso",   emoji: "📢", cor: "#64b5f6" },
  evento:  { label: "Evento",  emoji: "🏃", cor: "#e8ff47" },
  feriado: { label: "Feriado", emoji: "🎉", cor: "#ff9800" },
};

function formatarExpira(dataStr) {
  const [ano, mes, dia] = String(dataStr).split("-");
  const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function AvisoCard({ aviso, isAdmin, nomeAluno, onDeletar, onConfirmar }) {
  const cfg = CAT_CFG[aviso.categoria] || CAT_CFG.aviso;
  const jaConfirmou = aviso.confirmacoes?.some(c => c.aluno_nome === nomeAluno);
  const total = aviso.confirmacoes?.length ?? 0;
  const [expandirConfs, setExpandirConfs] = useState(false);

  return (
    <div className={`aviso-card aviso-cat-${aviso.categoria}`}>
      <div className="aviso-card-top">
        <span className="aviso-cat-badge" style={{ color: cfg.cor }}>
          {cfg.emoji} {cfg.label}
        </span>
        <span className="aviso-expira">até {formatarExpira(aviso.expira_em)}</span>
        {isAdmin && (
          <button className="aviso-del-btn" onClick={() => onDeletar(aviso.id)} title="Excluir">✕</button>
        )}
      </div>

      <h3 className="aviso-titulo">{aviso.titulo}</h3>

      {aviso.data_evento && (
        <p className="aviso-data-evento">🗓 {aviso.data_evento}</p>
      )}

      {aviso.corpo && (
        <p className="aviso-corpo">{aviso.corpo}</p>
      )}

      {aviso.categoria === "evento" && (
        <div className="aviso-confs">
          {!isAdmin && (
            <button
              className={`aviso-conf-btn ${jaConfirmou ? "confirmado" : ""}`}
              onClick={() => onConfirmar(aviso.id)}
            >
              {jaConfirmou ? "✓ Vou ir!" : "Confirmar presença"}
            </button>
          )}
          {total > 0 && (
            <button className="aviso-confs-toggle" onClick={() => setExpandirConfs(v => !v)}>
              {total} {total === 1 ? "confirmado" : "confirmados"} {expandirConfs ? "▴" : "▾"}
            </button>
          )}
          {expandirConfs && (
            <div className="aviso-confs-lista">
              {aviso.confirmacoes.map(c => (
                <span key={c.aluno_nome} className="aviso-conf-pill">{c.aluno_nome.split(" ")[0]}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Formulário de criação (admin) ────────────────────────────────────────────

const HOJE = new Date().toISOString().split("T")[0];

function AdminForm({ onCriado }) {
  const [aberto, setAberto] = useState(false);
  const [titulo,     setTitulo]     = useState("");
  const [corpo,      setCorpo]      = useState("");
  const [categoria,  setCategoria]  = useState("aviso");
  const [dataEvento, setDataEvento] = useState("");
  const [expiraEm,   setExpiraEm]   = useState("");
  const [salvando,   setSalvando]   = useState(false);
  const [erro,       setErro]       = useState("");

  function resetar() {
    setTitulo(""); setCorpo(""); setCategoria("aviso");
    setDataEvento(""); setExpiraEm(""); setErro("");
  }

  async function salvar() {
    if (!titulo.trim() || !expiraEm) { setErro("Título e validade são obrigatórios."); return; }
    setSalvando(true); setErro("");
    try {
      const novo = await criarAviso({
        titulo: titulo.trim(),
        corpo: corpo.trim() || null,
        categoria,
        data_evento: dataEvento.trim() || null,
        expira_em: expiraEm,
      });
      onCriado(novo);
      resetar();
      setAberto(false);
    } catch (e) {
      setErro(e.message || "Erro ao criar aviso.");
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return (
      <button className="aviso-novo-btn" onClick={() => setAberto(true)}>
        ＋ Novo aviso
      </button>
    );
  }

  return (
    <div className="aviso-form">
      <div className="aviso-form-header">
        <span className="aviso-form-titulo">Novo aviso</span>
        <button className="aviso-form-fechar" onClick={() => { resetar(); setAberto(false); }}>✕</button>
      </div>

      <div className="aviso-form-cats">
        {Object.entries(CAT_CFG).map(([val, { label, emoji }]) => (
          <button
            key={val}
            className={`aviso-cat-btn ${categoria === val ? "ativo" : ""}`}
            onClick={() => setCategoria(val)}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      <input
        className="aviso-input"
        placeholder="Título *"
        value={titulo}
        onChange={e => setTitulo(e.target.value)}
        maxLength={120}
      />

      {categoria === "evento" && (
        <input
          className="aviso-input"
          placeholder="Quando? (ex: Sábado 17/05 às 10h)"
          value={dataEvento}
          onChange={e => setDataEvento(e.target.value)}
          maxLength={80}
        />
      )}

      <textarea
        className="aviso-textarea"
        placeholder="Descrição (opcional)"
        value={corpo}
        onChange={e => setCorpo(e.target.value)}
        rows={3}
      />

      <div className="aviso-form-row aviso-form-row-expira">
        <label className="aviso-expira-label">Válido até</label>
        <input
          className="aviso-input aviso-input-data"
          type="date"
          min={HOJE}
          value={expiraEm}
          onChange={e => setExpiraEm(e.target.value)}
        />
      </div>

      {erro && <p className="aviso-erro">{erro}</p>}

      <button className="aviso-salvar-btn" onClick={salvar} disabled={salvando || !titulo.trim() || !expiraEm}>
        {salvando ? "Salvando..." : "Publicar aviso"}
      </button>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function Avisos({ isAdmin, nomeAluno }) {
  const [avisos,     setAvisos]     = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    getAvisos()
      .then(setAvisos)
      .catch(() => setAvisos([]))
      .finally(() => setCarregando(false));
  }, []);

  async function handleDeletar(id) {
    try {
      await deletarAviso(id);
      setAvisos(prev => prev.filter(a => a.id !== id));
    } catch { /* silencioso */ }
  }

  async function handleConfirmar(id) {
    try {
      const { confirmado } = await confirmarAviso(id);
      setAvisos(prev => prev.map(a => {
        if (a.id !== id) return a;
        const confs = confirmado
          ? [...(a.confirmacoes || []), { aluno_nome: nomeAluno }]
          : (a.confirmacoes || []).filter(c => c.aluno_nome !== nomeAluno);
        return { ...a, confirmacoes: confs };
      }));
    } catch { /* silencioso */ }
  }

  function handleCriado(novo) {
    setAvisos(prev => [novo, ...prev]);
  }

  return (
    <div className="page">
      <header className="app-header">
        <span className="logo">Focus Fitness</span>
        {isAdmin && <span className="admin-badge">Admin</span>}
      </header>

      <main className="feed">
        {isAdmin && <AdminForm onCriado={handleCriado} />}

        {carregando && (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">⏳</span>
            <p className="estado-vazio-titulo">Carregando...</p>
          </div>
        )}

        {!carregando && avisos.length === 0 && (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">📭</span>
            <p className="estado-vazio-titulo">Nenhum aviso por enquanto</p>
            <p className="estado-vazio-sub">Fique de olho aqui para novidades, eventos e feriados.</p>
          </div>
        )}

        {avisos.map(a => (
          <AvisoCard
            key={a.id}
            aviso={a}
            isAdmin={isAdmin}
            nomeAluno={nomeAluno}
            onDeletar={handleDeletar}
            onConfirmar={handleConfirmar}
          />
        ))}
      </main>
    </div>
  );
}
