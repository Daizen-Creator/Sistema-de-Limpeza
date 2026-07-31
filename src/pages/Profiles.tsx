import { useState } from "react";
import { api } from "../lib/api";
import MatrixConsole from "../components/MatrixConsole";

const PROFILES = [
  {
    id: "game",
    icon: "🎮",
    name: "Modo Game",
    color: "#22ff77",
    desc: "Alto desempenho, Game Mode, RAM liberada, updates pausados e rede otimizada para jogar.",
    bullets: ["Plano de energia máximo", "Windows Game Mode", "Pausa atualizações", "Libera memória"],
  },
  {
    id: "work",
    icon: "💼",
    name: "Modo Trabalho",
    color: "#00e5ff",
    desc: "Energia equilibrada, busca do Windows e atualizações ativas, aparência normal.",
    bullets: ["Energia equilibrada", "Busca ativa", "Updates ativos", "Aparência padrão"],
  },
  {
    id: "battery",
    icon: "🔋",
    name: "Modo Economia",
    color: "#ffd166",
    desc: "Para notebooks: reduz clock e brilho, desativa serviços pesados para durar mais.",
    bullets: ["Plano econômico", "Brilho 40%", "Serviços pesados off", "Libera memória"],
  },
];

export default function Profiles() {
  const [active, setActive] = useState<string | null>(null);
  const [run, setRun] = useState<null | { profile: string; title: string }>(null);

  function apply(id: string, name: string) {
    setRun({ profile: id, title: `SYSTEM :: ${name.toUpperCase()}` });
    api.logAdd("perfil", `Perfil aplicado: ${name}`);
    setActive(id);
  }

  return (
    <>
      <div className="page-head">
        <h2>Perfis de Uso</h2>
        <p>Troque o comportamento do PC com 1 clique conforme o que voce vai fazer. Tudo reversivel.</p>
      </div>

      <div className="grid cols-3">
        {PROFILES.map((p) => (
          <div className={`card profile-card ${active === p.id ? "active" : ""}`} key={p.id}
               style={{ ["--pc" as any]: p.color }}>
            <div className="profile-ico">{p.icon}</div>
            <div className="profile-name">{p.name}</div>
            <div className="profile-desc">{p.desc}</div>
            <ul className="profile-bullets">
              {p.bullets.map((b) => <li key={b}>{b}</li>)}
            </ul>
            <button className="btn profile-btn" onClick={() => apply(p.id, p.name)}>
              {active === p.id ? "✓ Ativo — reaplicar" : "Ativar perfil"}
            </button>
          </div>
        ))}
      </div>

      <div className="hint" style={{ marginTop: 16 }}>
        Os perfis alteram plano de energia, serviços e memória — todos reversíveis trocando de perfil.
        O <b>Modo Economia</b> é ideal para notebooks; alguns ajustes (brilho) só funcionam neles.
      </div>

      {run && (
        <MatrixConsole
          kind="profile"
          title={run.title}
          actions={run.profile}
          onClose={() => setRun(null)}
        />
      )}
    </>
  );
}
