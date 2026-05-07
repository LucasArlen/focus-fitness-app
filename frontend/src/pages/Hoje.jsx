import { useEffect, useState } from "react";
import { getTreinoHoje } from "../api/treino";
import BlocoCard from "../components/BlocoCard";
import SugestaoCard from "../components/SugestaoCard";
import DesafioRanking from "../components/DesafioRanking";

function formatarData(dataStr) {
  const [ano, mes, dia] = dataStr.split("-");
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    weekday: "short", day: "numeric", month: "short"
  });
}

export default function Hoje() {
  const [treino, setTreino] = useState(null);
  const [estado, setEstado] = useState("carregando");

  useEffect(() => {
    getTreinoHoje()
      .then(t => { setTreino(t); setEstado("ok"); })
      .catch(err => setEstado(err.message.includes("404") ? "vazio" : "erro"));
  }, []);

  return (
    <div className="page">
      <header className="app-header">
        <span className="logo">Focus Fitness</span>
        {treino && <span className="data-header">{formatarData(treino.data)}</span>}
      </header>

      <main className="feed">
        {estado === "carregando" && (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">⏳</span>
            <p className="estado-vazio-titulo">Carregando treino...</p>
          </div>
        )}

        {estado === "vazio" && (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">🏋️</span>
            <p className="estado-vazio-titulo">Nenhum treino hoje</p>
            <p className="estado-vazio-sub">O treinador ainda não publicou o treino de hoje. Volta em breve!</p>
          </div>
        )}

        {estado === "erro" && (
          <div className="estado-vazio">
            <span className="estado-vazio-icon">📡</span>
            <p className="estado-vazio-titulo">Sem conexão</p>
            <p className="estado-vazio-sub">Verifique sua internet e tente novamente.</p>
            <button className="btn-publicar" style={{ marginTop: 16 }} onClick={() => { setEstado("carregando"); getTreinoHoje().then(t => { setTreino(t); setEstado("ok"); }).catch(() => setEstado("erro")); }}>
              Tentar novamente
            </button>
          </div>
        )}

        {estado === "ok" && treino && (
          <>
            {treino.blocos.map(bloco =>
              bloco.sugestao
                ? <SugestaoCard key={bloco.id} bloco={bloco} />
                : <BlocoCard key={bloco.id} bloco={bloco} />
            )}
            {treino.desafio && <DesafioRanking desafio={treino.desafio} />}
          </>
        )}
      </main>
    </div>
  );
}
