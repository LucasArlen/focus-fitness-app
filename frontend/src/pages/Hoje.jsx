import { useEffect, useState } from "react";
import { getTreinoHoje } from "../api/treino";
import BlocoCard from "../components/BlocoCard";
import SugestaoCard from "../components/SugestaoCard";
import DesafioRanking from "../components/DesafioRanking";

function formatarData(dataStr) {
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function Hoje() {
  const [treino, setTreino] = useState(null);
  const [estado, setEstado] = useState("carregando"); // carregando | ok | vazio | erro

  useEffect(() => {
    getTreinoHoje()
      .then(t => { setTreino(t); setEstado("ok"); })
      .catch(err => setEstado(err.message.includes("404") ? "vazio" : "erro"));
  }, []);

  return (
    <div className="page">
      <header className="app-header">
        <span className="logo">Quadro.</span>
        {treino && <span className="data-header">{formatarData(treino.data)}</span>}
      </header>

      <main className="feed">
        {estado === "carregando" && <p className="estado-msg">Carregando treino...</p>}

        {estado === "vazio" && (
          <div className="estado-vazio">
            <p>Nenhum treino publicado hoje.</p>
            <p className="estado-hint">O treinador ainda não montou o treino de hoje.</p>
          </div>
        )}

        {estado === "erro" && (
          <p className="estado-msg erro">Erro ao carregar treino. Tente novamente.</p>
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
