import { useEffect, useRef, useState } from "react";
import MatrixConsole from "../components/MatrixConsole";
import { api } from "../lib/api";

export default function HackerMode() {
  const [running, setRunning] = useState(false);

  return (
    <>
      <div className="page-head">
        <h2>Modo Hacker — Varredura</h2>
        <p>
          Uma varredura completa de diagnostico do sistema, com visual estilo terminal.
          Mostra rede, portas, processos e o escudo do Windows — tudo <strong>local e sem
          alterar nada</strong> na sua maquina.
        </p>
      </div>

      <div className="hacker-hero">
        <div className="hk-grid" />
        <div className="hk-skull">☠</div>
        <div className="hk-info">
          <div className="hk-title">INICIAR VARREDURA DO SISTEMA</div>
          <div className="hk-sub">
            Rede · portas abertas · processos ativos · integridade dos drivers · Windows Defender
          </div>
          <button className="btn-hacker" onClick={() => setRunning(true)}>
            ▚ EXECUTAR VARREDURA
          </button>
        </div>
      </div>

      <div className="hint" style={{ marginTop: 16 }}>
        <strong>Somente leitura.</strong> O Modo Hacker apenas coleta e exibe informacoes do seu
        proprio computador de forma dramatica. Nao acessa outras maquinas nem a internet.
      </div>

      <Terminal />

      {running && (
        <MatrixConsole
          kind="hacker"
          title="SYSTEM :: INTRUSION SCAN"
          onClose={() => setRunning(false)}
        />
      )}
    </>
  );
}

/** Mini-terminal PowerShell integrado (modulo 20.2). */
function Terminal() {
  const [lines, setLines] = useState<{ cmd?: string; out?: string }[]>([
    { out: "NexusClean Terminal — PowerShell integrado. Digite um comando e Enter." },
  ]);
  const [cmd, setCmd] = useState("");
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines]);

  async function submit() {
    const c = cmd.trim();
    if (!c || busy) return;
    setLines((p) => [...p, { cmd: c }]);
    setHist((h) => [c, ...h].slice(0, 50));
    setHi(-1);
    setCmd("");
    if (c.toLowerCase() === "clear" || c.toLowerCase() === "cls") {
      setLines([]);
      return;
    }
    setBusy(true);
    const r = await api.termRun(c);
    setLines((p) => [...p, { out: r.output ?? r.message ?? "(sem saida)" }]);
    setBusy(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") submit();
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      const n = Math.min(hi + 1, hist.length - 1);
      if (n >= 0) { setHi(n); setCmd(hist[n]); }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const n = hi - 1;
      setHi(n);
      setCmd(n >= 0 ? hist[n] : "");
    }
  }

  return (
    <div className="term card" style={{ marginTop: 16 }}>
      <div className="term-head">⌨ Terminal integrado <span className="term-tag">PowerShell</span></div>
      <div className="term-body" ref={bodyRef}>
        {lines.map((l, i) => (
          <div key={i}>
            {l.cmd && <div className="term-cmd"><span className="term-prompt">PS&gt;</span> {l.cmd}</div>}
            {l.out && <div className="term-out">{l.out}</div>}
          </div>
        ))}
        {busy && <div className="term-out term-busy">executando…</div>}
      </div>
      <div className="term-input">
        <span className="term-prompt">PS&gt;</span>
        <input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={onKey}
          placeholder="ex: Get-Process | Sort CPU -Desc | Select -First 5   (ou 'clear')"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <div className="hint" style={{ marginTop: 10 }}>
        Roda comandos reais do PowerShell na sua maquina (local). Use com cuidado — tem o mesmo poder
        que abrir o PowerShell.
      </div>
    </div>
  );
}
