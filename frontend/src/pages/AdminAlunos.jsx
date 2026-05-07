import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../api/client";
import { getChamada, marcarPresenca, desmarcarPresenca } from "../api/presenca";

const PER_PAGE = 20;

export default function AdminAlunos({ onVoltar }) {
  const [chamada,    setChamada]    = useState([]);   // [{nome, presente, ordem_chegada}]
  const [busca,      setBusca]      = useState("");
  const [page,       setPage]       = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [toggling,   setToggling]   = useState(new Set());

  useEffect(() => {
    setCarregando(true);
    getChamada()
      .then(setChamada)
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  async function togglePresenca(nome, presente) {
    setToggling(prev => new Set(prev).add(nome));
    try {
      presente ? await desmarcarPresenca(nome) : await marcarPresenca(nome);
      setChamada(prev => prev.map(a =>
        a.nome === nome ? { ...a, presente: !presente } : a
      ));
    } catch { /* silencioso */ }
    finally {
      setToggling(prev => { const s = new Set(prev); s.delete(nome); return s; });
    }
  }

  // Filtra pela busca
  const buscaNorm = busca.trim().toLowerCase();
  const filtrados = chamada.filter(a =>
    !buscaNorm || a.nome.toLowerCase().includes(buscaNorm)
  );

  // Ordena: presentes por chegada, ausentes alfabético
  const ordenados = [...filtrados].sort((a, b) => {
    if (a.presente && b.presente) return a.ordem_chegada - b.ordem_chegada;
    if (a.presente !== b.presente) return a.presente ? -1 : 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  // Paginação
  const totalPages = Math.max(1, Math.ceil(ordenados.length / PER_PAGE));
  const pagina     = Math.min(page, totalPages);
  const visiveis   = ordenados.slice((pagina - 1) * PER_PAGE, pagina * PER_PAGE);

  // Volta pra página 1 quando busca muda
  useEffect(() => { setPage(1); }, [busca]);

  const totalPresentes = chamada.filter(a => a.presente).length;

  return (
    <div className="page">
      <header className="app-header">
        <button className="btn-voltar" onClick={onVoltar}>← Voltar</button>
        <span className="logo" style={{ fontSize: 16 }}>Chamada</span>
        <span className="dash-badge ok">{totalPresentes}/{chamada.length}</span>
      </header>

      <main className="feed">
        {carregando ? (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">⏳</span>
            <p className="estado-vazio-titulo">Carregando...</p>
          </div>
        ) : (
          <>
            <input
              className="chamada-busca"
              placeholder="Buscar aluno..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              autoComplete="off"
              autoFocus
            />

            {visiveis.length === 0 ? (
              <p className="dash-vazio-hint">
                {buscaNorm ? `Nenhum resultado para "${busca}".` : "Nenhum aluno cadastrado."}
              </p>
            ) : (
              <div className="chamada-lista">
                {visiveis.map(({ nome, presente, ordem_chegada }) => (
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
                    {presente && <span className="chamada-ordem">{ordem_chegada}º</span>}
                  </button>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="alunos-paginacao">
                <button className="pag-btn" disabled={pagina === 1}
                  onClick={() => setPage(p => p - 1)}>← Anterior</button>
                <span className="pag-info">{pagina} / {totalPages}</span>
                <button className="pag-btn" disabled={pagina === totalPages}
                  onClick={() => setPage(p => p + 1)}>Próxima →</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
