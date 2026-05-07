import { useEffect, useState } from "react";
import { getTreinoHoje } from "../api/treino";
import { getDesafioHoje } from "../api/desafio";
import { getChamada, marcarPresenca, desmarcarPresenca } from "../api/presenca";
import { getStatus, putStatus } from "../api/academia";
import { getInvite, regenerarConvite } from "../api/invite";

const STATUS_OPCOES = [
  { val: "vazio",     label: "Vago",      emoji: "😌" },
  { val: "tranquilo", label: "Tranquilo", emoji: "👌" },
  { val: "cheio",     label: "Cheio",     emoji: "🔥" },
  { val: "lotado",    label: "Lotado",    emoji: "🚨" },
  { val: "fechado",   label: "Fechado",   emoji: "🔒" },
];

export default function AdminDashboard({ onEditarTreino, onLogout }) {
  const [treino,   setTreino]   = useState(null);
  const [desafio,  setDesafio]  = useState(null);
  const [chamada,  setChamada]  = useState([]);   // [{nome, presente}]
  const [status,   setStatus]   = useState({ ativo: false, status: "tranquilo" });
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [regenerando, setRegenerando] = useState(false);
  const [qrExpandido, setQrExpandido] = useState(false);
  const [confirmarRegen, setConfirmarRegen] = useState(false);
  const [toggling, setToggling] = useState(new Set()); // nomes sendo salvos

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

  async function togglePresenca(nome, presente) {
    setToggling(prev => new Set(prev).add(nome));
    try {
      if (presente) {
        await desmarcarPresenca(nome);
      } else {
        await marcarPresenca(nome);
      }
      // Atualiza localmente sem recarregar tudo
      setChamada(prev =>
        prev.map(a => a.nome === nome ? { ...a, presente: !presente } : a)
      );
    } catch { /* silencioso */ }
    finally {
      setToggling(prev => { const s = new Set(prev); s.delete(nome); return s; });
    }
  }

  async function handleRegenar() {
    setRegenerando(true);
    try {
      const r = await regenerarConvite();
      setInviteCode(r.code);
    } catch { /* silencioso */ }
    finally {
      setRegenerando(false);
      setConfirmarRegen(false);
    }
  }

  const inviteUrl = inviteCode
    ? `${window.location.origin}/?c=${inviteCode}`
    : "";

  const qrImageUrl = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&data=${encodeURIComponent(inviteUrl)}`
    : "";

  async function compartilharQR() {
    try {
      // Tenta compartilhar a imagem do QR (funciona no Android/iOS)
      const resp = await fetch(qrImageUrl);
      const blob = await resp.blob();
      const file = new File([blob], "qr-academia.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "QR Code — Focus Fitness",
          text: "Escaneie para acessar o app da academia",
          files: [file],
        });
        return;
      }
    } catch { /* segue pro fallback */ }

    // Fallback: compartilha só o link
    try {
      await navigator.share({ title: "Focus Fitness", url: inviteUrl });
    } catch {
      // Último recurso: copia o link
      await navigator.clipboard.writeText(inviteUrl);
      alert("Link copiado!");
    }
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

  const totalExercicios = treino
    ? treino.blocos.reduce((acc, b) => acc + b.linhas.length, 0)
    : 0;

  const pontuacoes = desafio?.pontuacoes?.length ?? 0;

  // Ordenação: presentes por ordem de chegada, ausentes alfabético depois
  const chamadaOrdenada = [...chamada].sort((a, b) => {
    if (a.presente && b.presente) return a.ordem_chegada - b.ordem_chegada;
    if (a.presente !== b.presente) return a.presente ? -1 : 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

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
            <p className="dash-vazio-hint">Nenhum aluno cadastrado ainda.</p>
          ) : (
            <div className="chamada-lista">
              {chamadaOrdenada.map(({ nome, presente, ordem_chegada }) => (
                <button
                  key={nome}
                  className={`chamada-item ${presente ? "presente" : ""}`}
                  disabled={toggling.has(nome)}
                  onClick={() => togglePresenca(nome, presente)}
                >
                  <span className="chamada-check">
                    {toggling.has(nome) ? "⏳" : presente ? "✓" : ""}
                  </span>
                  <span className="chamada-nome">{nome}</span>
                  {presente && (
                    <span className="chamada-ordem">{ordem_chegada}º</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── DESAFIO ── */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-icon">🏆</span>
            <span className="dash-card-titulo">Desafio de Hoje</span>
          </div>
          {desafio ? (
            <>
              <p className="dash-desafio-nome" style={{ marginBottom: 6 }}>{desafio.nome}</p>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <p className="dash-numero" style={{ fontSize: 28 }}>{pontuacoes}</p>
                <span className="dash-mini-label">participantes</span>
                <span className={`dash-badge ${desafio.fechado ? "ok" : "aberto"}`} style={{ marginLeft: "auto" }}>
                  {desafio.fechado ? "Finalizado" : "Aberto"}
                </span>
              </div>
            </>
          ) : (
            <p className="dash-vazio-hint">Sem desafio hoje.</p>
          )}
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

                <div className="dash-qr-wrap">
                  <img
                    className="dash-qr-img"
                    src={qrImageUrl}
                    alt="QR Code de convite"
                  />
                </div>

                <button className="dash-qr-share" onClick={compartilharQR}>
                  ⬆️  Compartilhar QR code
                </button>

                <div className="dash-invite-code">
                  <span className="dash-invite-label">Código manual</span>
                  <code className="dash-invite-valor">{inviteCode}</code>
                </div>

                {!confirmarRegen ? (
                  <button
                    className="dash-invite-regen"
                    onClick={() => setConfirmarRegen(true)}
                  >
                    ↺  Gerar novo código
                  </button>
                ) : (
                  <div className="dash-regen-confirm">
                    <p className="dash-regen-aviso-strong">
                      ⚠️ O QR atual vai parar de funcionar.<br />
                      Você precisará imprimir um novo.
                    </p>
                    <div className="dash-regen-btns">
                      <button
                        className="dash-regen-btn-cancelar"
                        onClick={() => setConfirmarRegen(false)}
                        disabled={regenerando}
                      >
                        Cancelar
                      </button>
                      <button
                        className="dash-regen-btn-ok"
                        onClick={handleRegenar}
                        disabled={regenerando}
                      >
                        {regenerando ? "Gerando..." : "Sim, gerar novo"}
                      </button>
                    </div>
                  </div>
                )}
                <p className="dash-invite-aviso">
                  Alunos já cadastrados continuam normalmente — só novos cadastros precisam do QR.
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
