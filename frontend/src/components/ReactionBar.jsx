import { useState } from "react";

const EMOJIS = ["🔥", "💀", "❤️", "😅", "💪"];

export default function ReactionBar({ blocoId }) {
  const [selecionado, setSelecionado] = useState(null);

  function reagir(emoji) {
    setSelecionado(prev => (prev === emoji ? null : emoji));
  }

  return (
    <div className="reaction-bar">
      {EMOJIS.map(emoji => (
        <button
          key={emoji}
          className={`reaction-btn ${selecionado === emoji ? "ativo" : ""}`}
          onClick={() => reagir(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
