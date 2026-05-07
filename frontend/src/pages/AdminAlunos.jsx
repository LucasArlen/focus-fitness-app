import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

export default function AdminAlunos({ onVoltar }) {
  const [dados,      setDados]      = useState({ alunos: [], total: 0, page: 1, pages: 1 });
  const [page,       setPage]       = useState(1);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    apiFetch(`/alunos?page=${page}`)
      .then(setDados)
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [page]);

  const { alunos, total, pages } = dados;

  return (
    <div className="page">
      <header className="app-header">
        <button className="btn-voltar" onClick={onVoltar}>← Voltar</button>
        <span className="logo" style={{ fontSize: 16 }}>Alunos</span>
        <span className="dash-badge ok" style={{ fontSize: 13 }}>{total} total</span>
      </header>

      <main className="feed">
        {carregando ? (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">⏳</span>
            <p className="estado-vazio-titulo">Carregando...</p>
          </div>
        ) : (
          <>
            <div className="alunos-lista">
              {alunos.map((a, i) => (
                <div key={a.nome} className="aluno-row">
                  <span className="aluno-num">{(page - 1) * 20 + i + 1}</span>
                  <span className="aluno-nome">{a.nome}</span>
                  <span className="aluno-data">{a.criado_em}</span>
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div className="alunos-paginacao">
                <button
                  className="pag-btn"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Anterior
                </button>
                <span className="pag-info">{page} / {pages}</span>
                <button
                  className="pag-btn"
                  disabled={page === pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
