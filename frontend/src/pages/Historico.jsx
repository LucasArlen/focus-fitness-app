import { useEffect, useState } from "react";
import { getHistorico, getTreino } from "../api/ranking";

function fmt(data) {
  const [a, m, d] = data.split("-");
  return new Date(Number(a), Number(m) - 1, Number(d))
    .toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

export default function Historico({ nomeAluno, onLogoStart, onLogoEnd }) {
  const [lista, setLista]             = useState([]);
  const [estado, setEstado]           = useState("carregando");
  const [expandido, setExpandido]     = useState(null);
  const [treinoCache, setTreinoCache] = useState({});
  const [carregandoId, setCarregandoId] = useState(null);

  useEffect(() => {
    getHistorico(nomeAluno ?? "")
      .then(h => { setLista(h); setEstado("ok"); })
      .catch(() => setEstado("erro"));
  }, [nomeAluno]);

  async function toggle(id) {
    if (expandido === id) { setExpandido(null); return; }
    setExpandido(id);
    if (treinoCache[id]) return;
    setCarregandoId(id);
    try {
      const t = await getTreino(id);
      setTreinoCache(prev => ({ ...prev, [id]: t }));
    } catch { /* ignora */ }
    finally { setCarregandoId(null); }
  }

  return (
    <div className="page">
      <header className="app-header">
        <span
            className="logo"
            onMouseDown={onLogoStart}
            onMouseUp={onLogoEnd}
            onMouseLeave={onLogoEnd}
            onTouchStart={onLogoStart}
            onTouchEnd={onLogoEnd}
            onTouchCancel={onLogoEnd}
            onContextMenu={e => e.preventDefault()}
          >Focus Fitness</span>
        {nomeAluno && <span className="aluno-chip">👤 {nomeAluno}</span>}
      </header>

      <main className="feed">
        {estado === "carregando" && (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">⏳</span>
            <p className="estado-vazio-titulo">Carregando...</p>
          </div>
        )}

        {estado === "erro" && (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">📡</span>
            <p className="estado-vazio-titulo">Sem conexão</p>
            <p className="estado-vazio-sub">Verifique sua internet e tente novamente.</p>
          </div>
        )}

        {estado === "ok" && lista.length === 0 && (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">📅</span>
            <p className="estado-vazio-titulo">Nenhum treino ainda</p>
            <p className="estado-vazio-sub">Os treinos publicados vão aparecer aqui.</p>
          </div>
        )}

        {estado === "ok" && lista.map(item => {
          const aberto     = expandido === item.id;
          const treino     = treinoCache[item.id];
          const carregando = carregandoId === item.id;

          const meuResultado = treino?.desafio?.pontuacoes?.find(
            p => p.aluno_nome.trim().toLowerCase() === (nomeAluno ?? "").trim().toLowerCase()
          );

          // presente: null = sem info (aluno não logado), true/false = presença confirmada
          const presencaIcon = item.presente === true
            ? <span className="hist-presenca presente" title="Você treinou">✓</span>
            : item.presente === false
            ? <span className="hist-presenca ausente" title="Você não veio">○</span>
            : null;

          return (
            <div key={item.id} className="bloco-card hist-card" onClick={() => toggle(item.id)}>
              <div className="hist-row">
                {presencaIcon}
                <div className="hist-info">
                  <p className="hist-data">{fmt(item.data)}</p>
                  <p className="hist-blocos">
                    {item.total_blocos} bloco{item.total_blocos !== 1 ? "s" : ""} · {item.total_exercicios} exercício{item.total_exercicios !== 1 ? "s" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  {item.desafio_nome && (
                    <span className="hist-desafio">🏆 {item.desafio_nome}</span>
                  )}
                  {item.meu_resultado && (
                    <span className="hist-meu-resultado">{item.meu_resultado} reps</span>
                  )}
                </div>
                <span className="hist-chevron" style={{ transform: aberto ? "rotate(180deg)" : "" }}>▾</span>
              </div>

              {aberto && (
                <div className="hist-detalhe" onClick={e => e.stopPropagation()}>
                  {carregando && <p className="estado-hint" style={{ padding: "14px 16px" }}>Carregando...</p>}

                  {!carregando && treino && (
                    <>
                      {treino.desafio && (
                        <div className="hist-desafio-detalhe">
                          <span className="hist-desafio-titulo">🏆 {treino.desafio.nome}</span>
                          {meuResultado ? (
                            <div className="hist-desafio-resultado">
                              <span className="hist-resultado-label">Seu resultado</span>
                              <span className="hist-resultado-valor">{meuResultado.valor} reps</span>
                              {(() => {
                                const sorted = [...treino.desafio.pontuacoes]
                                  .sort((a, b) => (parseFloat(b.valor)||0) - (parseFloat(a.valor)||0));
                                const pos = sorted.findIndex(
                                  p => p.aluno_nome.trim().toLowerCase() === (nomeAluno ?? "").trim().toLowerCase()
                                );
                                const medalha = ["🥇","🥈","🥉"][pos];
                                return (
                                  <span className="hist-resultado-pos">
                                    {medalha ?? `${pos + 1}º`} de {sorted.length}
                                  </span>
                                );
                              })()}
                            </div>
                          ) : (
                            <p className="hist-desafio-sem-resultado">Você não participou deste desafio.</p>
                          )}
                        </div>
                      )}

                      {treino.blocos.map(b => (
                        <div key={b.id} className="hist-bloco">
                          <p className="hist-bloco-nome">{b.nome}</p>
                          {b.linhas.map(l => (
                            <div key={l.id} className="hist-linha">
                              <span className="hist-exercicio">{l.exercicio}</span>
                              <span className="hist-serie">{l.serie}</span>
                              {l.dropset && <span className="dropset-tag" title="Reduza o peso e continue sem pausa">DS</span>}
                            </div>
                          ))}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
