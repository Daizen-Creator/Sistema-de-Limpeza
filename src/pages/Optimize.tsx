import { useState } from "react";
import MatrixConsole from "../components/MatrixConsole";

const TWEAKS = [
  { icon: "⚡", t: "Plano de Alto Desempenho", d: "Libera a CPU para rodar na frequencia maxima." },
  { icon: "🧠", t: "Liberar memoria RAM", d: "Esvazia cache de processos e libera RAM para jogos." },
  { icon: "🎮", t: "Modo Jogo (Game Mode)", d: "Prioriza o jogo em foco e reduz interrupcoes." },
  { icon: "🖥️", t: "Prioridade de GPU", d: "Ativa o agendamento de GPU por hardware." },
  { icon: "✨", t: "Efeitos visuais rapidos", d: "Reduz animacoes para uma resposta mais agil." },
  { icon: "🌐", t: "Otimizar rede", d: "Limpa cache DNS e reduz latencia online." },
];

export default function Optimize({ elevated }: { elevated: boolean }) {
  const [running, setRunning] = useState(false);

  return (
    <>
      <div className="page-head">
        <h2>Turbo FPS — Otimizacao</h2>
        <p>
          Aplica um conjunto de ajustes <strong>seguros e reversiveis</strong> para maximizar
          desempenho em jogos e no dia a dia. Ideal antes de abrir um jogo pesado.
        </p>
      </div>

      <div className="fps-hero">
        <div className="fps-glow" />
        <div className="fps-num">
          +FPS
          <span className="fps-cap">MODO TURBO</span>
        </div>
        <div className="fps-info">
          <div className="fps-title">Aumente seus FPS com 1 clique</div>
          <div className="fps-sub">
            Alto desempenho + RAM livre + Game Mode + prioridade de GPU aplicados de uma vez.
          </div>
          <button className="btn-turbo big" onClick={() => setRunning(true)}>
            <span className="bolt">⚡</span> ATIVAR TURBO
          </button>
        </div>
      </div>

      {!elevated && (
        <div className="hint warn" style={{ marginBottom: 16 }}>
          Alguns ajustes (GPU, energia) exigem administrador. O app ja tenta abrir elevado;
          se recusou, reabra como administrador para o efeito total.
        </div>
      )}

      <div className="grid cols-3">
        {TWEAKS.map((tw) => (
          <div className="card tweak" key={tw.t}>
            <div className="tweak-ico">{tw.icon}</div>
            <div>
              <div className="tweak-title">{tw.t}</div>
              <div className="tweak-desc">{tw.d}</div>
            </div>
          </div>
        ))}
      </div>

      {running && (
        <MatrixConsole
          kind="optimize"
          title="SYSTEM :: TURBO BOOST"
          onClose={() => setRunning(false)}
        />
      )}
    </>
  );
}
