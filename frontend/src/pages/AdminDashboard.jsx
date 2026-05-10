import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { getTreinoHoje, getSemana } from "../api/treino";
import { getDesafioHoje } from "../api/desafio";
import { getChamada, marcarPresenca } from "../api/presenca";
import { getStatus, putStatus } from "../api/academia";
import { getInvite, regenerarConvite } from "../api/invite";

const STATUS_OPCOES = [
  { val: "vazio",     label: "Vago",      emoji: "😌" },
  { val: "tranquilo", label: "Tranquilo", emoji: "👌" },
  { val: "cheio",     label: "Cheio",     emoji: "🔥" },
  { val: "lotado",    label: "Lotado",    emoji: "🚨" },
  { val: "fechado",   label: "Fechado",   emoji: "🔒" },
];

export default function AdminDashboard({ onEditarTreino, onVerAlunos, onModoAula, onLogout, onVerComoAluno }) {
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
  const [qrColapsado,   setQrColapsado]  = useState(true);
  const [linkCopiado,   setLinkCopiado]   = useState(false);
  const [buscaChamada,  setBuscaChamada]  = useState("");
  const [credAberto,    setCredAberto]    = useState(false);
  const [credUser,      setCredUser]      = useState("");
  const [credPass,      setCredPass]      = useState("");
  const [credStatus,    setCredStatus]    = useState(null); // "ok" | "erro" | null
  const [marcando,      setMarcando]      = useState(null);
  const [semana,        setSemana]        = useState([]);

  function carregar() {
    setCarregando(true);
    Promise.allSettled([
      getTreinoHoje().then(setTreino).catch(() => setTreino(null)),
      getDesafioHoje().then(setDesafio).catch(() => setDesafio(null)),
      getChamada().then(setChamada).catch(() => setChamada([])),
      getStatus().then(setStatus).catch(() => {}),
      getInvite().then(r => setInviteCode(r.code)).catch(() => {}),
      getSemana().then(setSemana).catch(() => {}),
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


  async function selecionarAluno(nome) {
    setBuscaChamada("");
    setMarcando(nome);
    try {
      await marcarPresenca(nome);
      // re-fetch para pegar ordem_chegada correta do servidor
      const nova = await getChamada();
      setChamada(nova);
    } catch { /* silencioso */ }
    finally { setMarcando(null); }
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

  const buscaNorm    = buscaChamada.trim().toLowerCase();
  const sugestoes    = buscaNorm
    ? chamada.filter(a => !a.presente && a.nome.toLowerCase().includes(buscaNorm))
    : [];
  const ultimosChegados = chamada
    .filter(a => a.presente)
    .sort((a, b) => b.ordem_chegada - a.ordem_chegada)
    .slice(0, 5);

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

        {/* ── SEMANA ── */}
        {semana.length > 0 && (
          <div className="semana-strip">
            {semana.map(dia => {
              const [, , d] = dia.data.split("-");
              const label = new Date(dia.data + "T12:00:00")
                .toLocaleDateString("pt-BR", { weekday: "short" })
                .replace(".", "");
              return (
                <button
                  key={dia.data}
                  className={`semana-dia ${dia.eh_hoje ? "hoje" : ""} ${dia.tem_treino ? "tem-treino" : ""}`}
                  onClick={onEditarTreino}
                  title={dia.tem_treino ? `${dia.total_blocos} bloco(s)` : "Sem treino"}
                >
                  <span className="semana-dia-label">{label}</span>
                  <span className="semana-dia-num">{d}</span>
                  <span className="semana-dia-dot" />
                </button>
              );
            })}
          </div>
        )}

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
            <span className="dash-card-titulo">Aula de hoje</span>
            <span className="dash-badge ok" style={{ marginLeft: "auto" }}>
              {totalPresentes}/{chamada.length}
            </span>
          </div>

          {chamada.length === 0 ? (
            <div className="dash-chamada-vazio">
              <p className="dash-vazio-hint">Nenhum aluno cadastrado ainda. Compartilhe o convite para os alunos entrarem.</p>
            </div>
          ) : (
            <>
              {/* Últimos 3 chegados como preview */}
              {ultimosChegados.length > 0 ? (
                <div className="dash-chegadas">
                  {ultimosChegados.slice(0, 3).map(a => (
                    <div key={a.nome} className="dash-chegada-item">
                      <span className="dash-chegada-ordem">{a.ordem_chegada}º</span>
                      <span className="dash-chegada-nome">{a.nome}</span>
                    </div>
                  ))}
                  {totalPresentes > 3 && (
                    <p className="dash-chegada-mais">+ {totalPresentes - 3} aluno{totalPresentes - 3 !== 1 ? "s" : ""}</p>
                  )}
                </div>
              ) : (
                <p className="dash-vazio-hint">Ninguém chegou ainda.</p>
              )}

              <button className="dash-action-btn dash-action-btn-destaque" onClick={onModoAula} style={{ width: "100%" }}>
                🎯  Abrir Modo Aula
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
            <div
              className="dash-card-header dash-card-header-toggle"
              onClick={() => setQrColapsado(v => !v)}
            >
              <span className="dash-card-icon">🔗</span>
              <span className="dash-card-titulo">Acesso de novos alunos</span>
              <span className="dash-badge ok" style={{ marginLeft: "auto" }}>Ativo</span>
              <span className="dash-collapse-chevron" style={{ transform: qrColapsado ? "" : "rotate(180deg)" }}>▾</span>
            </div>

            {!qrColapsado && (
              <>
                <div className="dash-qr-wrap">
                  <img className="dash-qr-img" src={qrImageUrl} alt="QR Code de convite" />
                </div>

                <div className="dash-invite-code">
                  <span className="dash-invite-label">Código</span>
                  <code className="dash-invite-valor">{inviteCode}</code>
                </div>

                <div className="invite-qr-actions">
                  <button className="invite-qr-btn" onClick={compartilharLink}>
                    {linkCopiado ? "✓ Copiado" : "📤 Compartilhar link"}
                  </button>
                  <button className="invite-qr-btn" onClick={compartilharQR}>
                    ⬆️ Salvar QR
                  </button>
                </div>

                {!confirmarRegen ? (
                  <button className="invite-toggle-qr" onClick={() => setConfirmarRegen(true)}>
                    ↺ Gerar novo código
                  </button>
                ) : (
                  <div className="invite-regen-confirm">
                    <span className="invite-regen-aviso">⚠️ O link atual vai parar de funcionar.</span>
                    <div className="invite-regen-acoes">
                      <button className="invite-qr-btn danger" onClick={handleRegenar} disabled={regenerando}>
                        {regenerando ? "..." : "Confirmar"}
                      </button>
                      <button className="invite-cancelar" onClick={() => setConfirmarRegen(false)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── CREDENCIAIS ── */}
        <div className="dash-card">
          <div
            className="dash-card-header dash-card-header-toggle"
            onClick={() => { setCredAberto(v => !v); setCredStatus(null); }}
          >
            <span className="dash-card-icon">🔑</span>
            <span className="dash-card-titulo">Login do admin</span>
            <span className="dash-collapse-chevron" style={{ marginLeft: "auto", transform: credAberto ? "rotate(180deg)" : "" }}>▾</span>
          </div>

          {credAberto && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
              <input
                className="cred-input"
                type="text"
                placeholder="Novo usuário"
                value={credUser}
                onChange={e => setCredUser(e.target.value)}
                autoComplete="off"
              />
              <input
                className="cred-input"
                type="password"
                placeholder="Nova senha"
                value={credPass}
                onChange={e => setCredPass(e.target.value)}
                autoComplete="new-password"
              />
              {credStatus === "ok"   && <p className="cred-feedback ok">✓ Salvo! Use as novas credenciais no próximo login.</p>}
              {credStatus === "erro" && <p className="cred-feedback erro">✗ Erro ao salvar. Tente novamente.</p>}
              <button
                className="dash-action-btn"
                disabled={!credUser.trim() || !credPass.trim()}
                onClick={async () => {
                  try {
                    await apiFetch("/admin/credenciais", { method: "PUT", body: JSON.stringify({ username: credUser, password: credPass }) });
                    setCredStatus("ok");
                    setCredUser(""); setCredPass("");
                  } catch { setCredStatus("erro"); }
                }}
              >
                Salvar credenciais
              </button>
            </div>
          )}
        </div>

        {/* ── VER COMO ALUNO ── */}
        <button className="dash-preview-btn" onClick={onVerComoAluno}>
          👁  Ver como aluno
        </button>

        {/* ── ATUALIZAR ── */}
        <button className="dash-refresh-btn" onClick={carregar} disabled={carregando}>
          {carregando ? "Atualizando..." : "↻  Atualizar dados"}
        </button>

      </main>
    </div>
  );
}
