export const treinoHoje = {
  data: "2025-05-07",
  publicado: true,
  blocos: [
    {
      id: 1,
      nome: "Aquecimento",
      sugestao: false,
      linhas: [
        { id: 1, exercicio: "Corrida", serie: "15min", dropset: false },
        { id: 2, exercicio: "Mobilidade de quadril", serie: "3x10", dropset: false },
        { id: 3, exercicio: "Polichinelo", serie: "2x30", dropset: false },
      ],
    },
    {
      id: 2,
      nome: "Treino",
      sugestao: false,
      linhas: [
        { id: 4, exercicio: "Agachamento", serie: "4x12", dropset: false },
        { id: 5, exercicio: "Supino", serie: "60-50-40", dropset: true },
        { id: 6, exercicio: "Remada", serie: "4x15", dropset: false },
        { id: 7, exercicio: "Burpees", serie: "3x20", dropset: false },
      ],
    },
    {
      id: 3,
      nome: "Cardio",
      sugestao: false,
      linhas: [
        { id: 8, exercicio: "Corda", serie: "300-280-250", dropset: false },
        { id: 9, exercicio: "Abdominal", serie: "até a falha", dropset: false },
      ],
    },
    {
      id: 4,
      nome: "Sugestão",
      sugestao: true,
      linhas: [
        { id: 10, exercicio: "Agachamento Sumô", serie: "4x12", dropset: false },
        { id: 11, exercicio: "Elevação lateral", serie: "3x15", dropset: true },
        { id: 12, exercicio: "Prancha", serie: "3x45seg", dropset: false },
      ],
    },
  ],
  desafio: {
    id: 1,
    nome: "Agachamento c/ Salto",
    fechado: true,
    pontuacoes: [
      { id: 1, aluno_nome: "João", valor: "87rpt", ordem: 1 },
      { id: 2, aluno_nome: "Ana", valor: "74rpt", ordem: 2 },
      { id: 3, aluno_nome: "Pedro", valor: "68rpt", ordem: 3 },
      { id: 4, aluno_nome: "Maria", valor: "61rpt", ordem: 4 },
      { id: 5, aluno_nome: "Lucas", valor: "55rpt", ordem: 5 },
    ],
  },
};
