import { useEffect, useState } from "react";
import { getTreinoHoje } from "../api/treino";
import { getDesafioHoje } from "../api/desafio";
import { getChamada } from "../api/presenca";
import { getStatus, putStatus } from "../api/academia";
import { getInvite, regenerarConvite } from "../api/invite";
import { apiFetch } from "../api/client";

const STATUS_OPCOES = [
  { val: "vazio",     label: "Vago",      emoji: "😌" },
  { val: "tranquilo", label: "Tranquilo", emoji: "👌" },
  { val: "cheio",     label: "Cheio",     emoji: "🔥" },
  { val: "lotado",    label: "Lotado",    emoji: "🚨" },
  { val: "fechado",   label: "Fechado",   emoji: "🔒" },
];

export default function AdminDashboard({ onEditarTreino, onVerAlunos, onLogout }) {
  const [treino,        setTreino]        = useState(null);
  const [desafio,       setDesafio]       = useState(null);
  const [chamada,       setChamada]       = useState([]);
  const [status,        setStatus]        = useState({ ativo: false, status: "tranquilo" });
  const [salvandoStatus,setSalvandoStatus]= useState(false);
  const [carregando,    setCarregando]    = useState(true);
  const [inviteCode,    setInviteCode]    = useState("");
  const [regenerando,   setRegenerando]   = useState(false);
  const [qrExpandido,   setQrExpandido]   = useState(false);
  const [confirmarRegen,setConfirmarRegen]= useState(false);
  const [linkCopiado,   setLinkCopiado]   = useState(false);
  const [seeding,       setSeeding]       = useState(false);

  function carregar() {
    setCarregando(true);
    Promise.allSettled([
      getTreinoHoje().then(setTreino).catch(() => setTreino(null)),
      getDesafioHoje().then(setDesafio).catch(() => setDesafio(null)),
      getChamada().then(setChamada).catch(() => setChamada([])),
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
    finally { setRegenerando(false); setConfirmarRegen(false); }
  }

  const inviteUrl   = inviteCode ? `${window.location.origin}/?c=${inviteCode}` : "";
  const qrImageUrl  = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&color=e8ff47&bgcolor=141414&data=${encodeURIComponent(inviteUrl)}`
    : "";

  async function compartilharLink() {
    try {
      await navigator.share({ title: "Focus Fitness", url: inviteUrl });
    } catch {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setLinkCopiado(true);
        setTimeout(() => setLinkCopiado(false), 2500);
      } catch { /* silencioso */ }
    }
  }

  async function compartilharQR() {
    try {
      const blob = await fetch(qrImageUrl).then(r => r.blob());
      const file = new File([blob], "qr-academia.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "QR Code — Focus Fitness", files: [file] });
        return;
      }
    } catch { /* silencioso */ }
    await compartilharLink();
  }

  async function seed() {
    setSeeding(true);
    try {
      await apiFetch("/admin/seed", { method: "POST" });
      await getChamada().then(setChamada);
    } catch { /* silencioso */ }
    finally { setSeeding(false); }
  }

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
  const totalExercicios = treino?.blocos.reduce((a, b) => a + b.linhas.length, 0) ?? 0;
  const pontuacoes      = desafio?.pontuacoes?.length ?? 0;

  const totalPresentes = chamada.filter(a => a.presente).length;

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
            <span className={`dash-badge ${treino ? "ok" : "vazio"}`} style={{ marginLeft: "auto" }}>
              {treino ? "Publicado" : "Não publicado"}
            </span>
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

        {/* ── CHAMADA ── */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-icon">👥</span>
            <span className="dash-card-titulo">Chamada</span>
            <span className="dash-badge ok" style={{ marginLeft: "auto" }}>
              {totalPresentes}/{chamada.length}
            </span>
          </div>

          {chamada.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "4px 0 8px" }}>
              <p className="dash-vazio-hint">Nenhum aluno cadastrado ainda.</p>
              <button className="dash-invite-regen" onClick={seed} disabled={seeding}>
                {seeding ? "Criando..." : "🧪  Adicionar alunos de teste"}
              </button>
            </div>
          ) : (
            <>
              {/* pills dos presentes */}
              {totalPresentes > 0 && (
                <div className="chamada-pills">
                  {chamada
                    .filter(a => a.presente)
                    .sort((a, b) => a.ordem_chegada - b.ordem_chegada)
                    .map(a => (
                      <span key={a.nome} className="chamada-pill">{a.nome.split(" ")[0]}</span>
                    ))}
                </div>
              )}
              {totalPresentes === 0 && (
                <p className="dash-vazio-hint">Ninguém marcado ainda.</p>
              )}
              <button className="dash-action-btn" onClick={onVerAlunos}>
                👥  Abrir chamada
              </button>
            </>
          )}
        </div>

        {/* ── DESAFIO + STATUS (linha) ── */}
        <div className="dash-row">
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
                  {desafio.fechado ? "Encerrado" : "Aberto"}
                </span>
              </>
            ) : (
              <p className="dash-vazio-hint">Sem desafio hoje.</p>
            )}
          </div>

          <div className="dash-card dash-half">
            <div className="dash-card-header">
              <span className="dash-card-icon">📍</span>
              <span className="dash-card-titulo">Status</span>
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
              <p className="dash-vazio-hint" style={{ paddingBottom: 8, fontSize: 12 }}>
                Ative para exibir aos alunos.
              </p>
            )}
          </div>
        </div>

        {/* ── CONVITE ── */}
        {inviteCode && (
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-icon">🔗</span>
              <span className="dash-card-titulo">Acesso de novos alunos</span>
              <span className="dash-badge ok" style={{ marginLeft: "auto" }}>Ativo</span>
            </div>

            {/* link + botão de compartilhar numa linha */}
            <div className="invite-link-row">
              <span className="invite-link-texto">
                {inviteUrl.replace("https://", "").slice(0, 32)}…
              </span>
              <button
                className={`invite-share-btn ${linkCopiado ? "copiado" : ""}`}
                onClick={compartilharLink}
              >
                {linkCopiado ? "✓" : "📤"}
              </button>
            </div>

            {/* QR colapsável */}
            <button className="invite-toggle-qr" onClick={() => setQrExpandido(v => !v)}>
              {qrExpandido ? "▴ ocultar QR" : "▾ QR para imprimir"}
            </button>

            {qrExpandido && (
              <div className="dash-invite-body">
                <div className="dash-qr-wrap">
                  <img className="dash-qr-img" src={qrImageUrl} alt="QR Code" />
                </div>

                <div className="invite-qr-actions">
                  <button className="invite-qr-btn" onClick={compartilharQR}>
                    ⬆️ Salvar imagem
                  </button>

                  {!confirmarRegen ? (
                    <button className="invite-qr-btn danger" onClick={() => setConfirmarRegen(true)}>
                      ↺ Novo código
                    </button>
                  ) : (
                    <button className="invite-qr-btn danger" onClick={handleRegenar} disabled={regenerando}>
                      {regenerando ? "..." : "⚠️ Confirmar"}
                    </button>
                  )}
                </div>

                {confirmarRegen && (
                  <p className="dash-invite-aviso" style={{ color: "var(--danger)" }}>
                    O link atual vai parar de funcionar.{" "}
                    <button className="invite-cancelar" onClick={() => setConfirmarRegen(false)}>
                      Cancelar
                    </button>
                  </p>
                )}

                <p className="dash-invite-aviso">
                  Alunos já cadastrados não são afetados.
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
