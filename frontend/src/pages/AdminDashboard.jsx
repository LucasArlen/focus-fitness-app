import { useEffect, useState } from "react";
import { getTreinoHoje } from "../api/treino";
import { getDesafioHoje } from "../api/desafio";
import { getPresencas } from "../api/presenca";
import { getStatus, putStatus } from "../api/academia";
import { getInvite, regenerarConvite } from "../api/invite";

const STATUS_OPCOES = [
  { val: "vazio",     label: "Vago",      emoji: "😌" },
  { val: "tranquilo", label: "Tranquilo", emoji: "👌" },
  { val: "cheio",     label: "Cheio",     emoji: "🔥" },
  { val: "lotado",    label: "Lotado",    emoji: "🚨" },
  { val: "fechado",   label: "Fechado",   emoji: "🔒" },
];

const STATUS_COR = {
  vazio:     "#64b5f6",
  tranquilo: "#4cd964",
  cheio:     "#ff9800",
  lotado:    "#ff5252",
  fechado:   "#ff5252",
};

export default function AdminDashboard({ onEditarTreino, onLogout }) {
  const [treino,   setTreino]   = useState(null);
  const [desafio,  setDesafio]  = useState(null);
  const [presenca, setPresenca] = useState({ nomes: [], total: 0 });
  const [status,   setStatus]   = useState({ ativo: false, status: "tranquilo" });
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [regenerando, setRegenerando] = useState(false);
  const [qrExpandido, setQrExpandido] = useState(false);

  function carregar() {
    setCarregando(true);
    Promise.allSettled([
      getTreinoHoje().then(setTreino).catch(() => setTreino(null)),
      getDesafioHoje().then(setDesafio).catch(() => setDesafio(null)),
      getPresencas().then(setPresenca).catch(() => {}),
      getStatus().then(setStatus).catch(() => {}),
      getInvite().then(r => setInviteCode(r.code)).catch(() => {}),
    ]).finally(() => setCarregando(false));
  }

  useEffect(() => { carregar(); }, []);

  async function handleRegenar() {
    setRegenerando(true);
    try {
      const r = await regenerarConvite();
      setInviteCode(r.code);
    } catch { /* silencioso */ }
    finally { setRegenerando(false); }
  }

  const inviteUrl = inviteCode
    ? `${window.location.origin}/?c=${inviteCode}`
    : "";

  async function atualizarStatus(novoAtivo, novoVal) {
    setSalvandoStatus(true);
    try {
      const r = await putStatus({ ativo: novoAtivo, status: novoVal });
      setStatus(r);
    } catch { /* silencioso */ }
    finally { setSalvandoStatus(false); }
  }

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const totalExercicios = treino
    ? treino.blocos.reduce((acc, b) => acc + b.linhas.length, 0)
    : 0;

  const cfgStatus = STATUS_OPCOES.find(o => o.val === status.status);
  const pontuacoes = desafio?.pontuacoes?.length ?? 0;

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
        <p className="data-header" style={{ textTransform: "capitalize", paddingTop: 4 }}>
          {hoje}
        </p>

        {/* ── TREINO ── */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-icon">📋</span>
            <span className="dash-card-titulo">Treino de Hoje</span>
            {treino
              ? <span className="dash-badge ok">Publicado</span>
              : <span className="dash-badge vazio">Não publicado</span>}
          </div>

          {treino ? (
            <>
              <div className="dash-treino-stats">
                <div className="dash-mini-stat">
                  <span className="dash-mini-val">{treino.blocos.length}</span>
                  <span className="dash-mini-label">blocos</span>
                </div>
                <div className="dash-mini-stat">
                  <span className="dash-mini-val">{totalExercicios}</span>
                  <span className="dash-mini-label">exercícios</span>
                </div>
                {treino.desafio && (
                  <div className="dash-mini-stat">
                    <span className="dash-mini-val">🏆</span>
                    <span className="dash-mini-label">desafio</span>
                  </div>
                )}
              </div>
              <div className="dash-blocos-chips">
                {treino.blocos.map(b => (
                  <span key={b.id} className={`dash-bloco-chip ${b.sugestao ? "sugestao" : ""}`}>
                    {b.nome}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="dash-vazio-hint">Nenhum treino publicado hoje.</p>
          )}

          <button className="dash-action-btn" onClick={onEditarTreino}>
            {treino ? "✏️  Editar treino" : "➕  Criar treino"}
          </button>
        </div>

        {/* ── CONFIRMADOS + DESAFIO ── */}
        <div className="dash-row">

          {/* Confirmados */}
          <div className="dash-card dash-half">
            <div className="dash-card-header">
              <span className="dash-card-icon">👥</span>
              <span className="dash-card-titulo">Confirmados</span>
            </div>
            <p className="dash-numero">{presenca.total}</p>
            {presenca.nomes.length > 0 ? (
              <div className="dash-nomes-list">
                {presenca.nomes.slice(0, 6).map(n => (
                  <span key={n} className="dash-nome-pill">{n.split(" ")[0]}</span>
                ))}
                {presenca.total > 6 && (
                  <span className="dash-nome-pill mais">+{presenca.total - 6}</span>
                )}
              </div>
            ) : (
              <p className="dash-vazio-hint">Ninguém ainda.</p>
            )}
          </div>

          {/* Desafio */}
          <div className="dash-card dash-half">
            <div className="dash-card-header">
              <span className="dash-card-icon">🏆</span>
              <span className="dash-card-titulo">Desafio</span>
            </div>
            {desafio ? (
              <>
                <p className="dash-numero">{pontuacoes}</p>
                <p className="dash-desafio-nome">{desafio.nome}</p>
                <span className={`dash-badge ${desafio.fechado ? "ok" : "aberto"}`}>
                  {desafio.fechado ? "Finalizado" : "Aberto"}
                </span>
              </>
            ) : (
              <>
                <p className="dash-numero" style={{ color: "var(--text-3)" }}>—</p>
                <p className="dash-vazio-hint">Sem desafio hoje.</p>
              </>
            )}
          </div>
        </div>

        {/* ── STATUS DA ACADEMIA ── */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-icon">📍</span>
            <span className="dash-card-titulo">Status da Academia</span>
            <label className="status-toggle-wrap" style={{ marginLeft: "auto" }}>
              <input type="checkbox" className="status-toggle-input"
                checked={status.ativo} disabled={salvandoStatus}
                onChange={e => atualizarStatus(e.target.checked, status.status)} />
              <span className={`status-toggle-track ${status.ativo ? "on" : ""}`}>
                <span className="status-toggle-thumb" />
              </span>
            </label>
          </div>

          {status.ativo ? (
            <div className="status-opcoes-grid">
              {STATUS_OPCOES.map(op => (
                <button key={op.val}
                  className={`status-opcao-btn ${status.status === op.val ? "ativo" : ""}`}
                  disabled={salvandoStatus}
                  onClick={() => atualizarStatus(true, op.val)}>
                  <span className="status-opcao-emoji">{op.emoji}</span>
                  <span className="status-opcao-label">{op.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="dash-vazio-hint" style={{ paddingBottom: 14 }}>
              Ative para mostrar o status aos alunos.
            </p>
          )}
        </div>

        {/* ── QR CODE DE CONVITE ── */}
        {inviteCode && (
          <div className="dash-card">
            <div className="dash-card-header" style={{ cursor: "pointer" }}
              onClick={() => setQrExpandido(v => !v)}>
              <span className="dash-card-icon">🔗</span>
              <span className="dash-card-titulo">Acesso de novos alunos</span>
              <span className="dash-badge ok">Ativo</span>
              <span style={{ color: "var(--text-3)", fontSize: 13, marginLeft: 4 }}>
                {qrExpandido ? "▴" : "▾"}
              </span>
            </div>

            {qrExpandido && (
              <div className="dash-invite-body">
                <p className="dash-invite-hint">
                  Coloque o QR code na parede da academia. Só quem escanear consegue se cadastrar.
                </p>

                {/* QR gerado via API pública — sem dependência npm */}
                <div className="dash-qr-wrap">
                  <img
                    className="dash-qr-img"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(inviteUrl)}`}
                    alt="QR Code de convite"
                  />
                </div>

                <div className="dash-invite-code">
                  <span className="dash-invite-label">Código manual</span>
                  <code className="dash-invite-valor">{inviteCode}</code>
                </div>

                <button
                  className="dash-invite-regen"
                  onClick={handleRegenar}
                  disabled={regenerando}
                >
                  {regenerando ? "Gerando..." : "↺  Gerar novo código"}
                </button>
                <p className="dash-invite-aviso">
                  Gerar novo código invalida o QR atual — alunos já cadastrados continuam normalmente.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── ATUALIZAR ── */}
        <button className="dash-refresh-btn" onClick={carregar} disabled={carregando}>
          {carregando ? "Atualizando..." : "↻  Atualizar dados"}
        </button>

      </main>
    </div>
  );
}
