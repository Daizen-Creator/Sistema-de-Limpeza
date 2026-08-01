import { useEffect, useRef } from "react";

/**
 * Polling seguro contra travamentos:
 *  - pausa quando a janela esta oculta/minimizada (document.hidden);
 *  - nunca sobrepoe chamadas (espera a anterior terminar antes da proxima);
 *  - limpa o intervalo ao desmontar.
 * Isso evita acumular chamadas de PowerShell no backend e travar a interface.
 */
export function usePoll(fn: () => Promise<unknown> | unknown, intervalMs: number, deps: unknown[] = []) {
  const busy = useRef(false);
  useEffect(() => {
    let stopped = false;
    async function tick() {
      if (stopped || document.hidden || busy.current) return;
      busy.current = true;
      try {
        await fn();
      } catch {
        /* ignora erros de rede transitorios */
      } finally {
        busy.current = false;
      }
    }
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => {
      stopped = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
