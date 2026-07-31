import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Logo from "./Logo";

/** Barra de titulo personalizada (tema hacker). Substitui a moldura padrao do Windows. */
export default function TitleBar() {
  const [max, setMax] = useState(false);

  useEffect(() => {
    api.winIsMaximized().then(setMax).catch(() => {});
    return api.onMaximizeChange(setMax);
  }, []);

  return (
    <div className="titlebar">
      <div className="tb-brand">
        <Logo size={18} />
        <span className="tb-title">NEXUS<b>CLEAN</b></span>
        <span className="tb-sep">::</span>
        <span className="tb-tag">otimizador do sistema</span>
      </div>

      <div className="tb-controls">
        <button className="tb-btn" title="Minimizar" onClick={() => api.winMinimize()}>
          <svg width="11" height="11" viewBox="0 0 11 11"><rect x="1" y="5" width="9" height="1.2" fill="currentColor" /></svg>
        </button>
        <button className="tb-btn" title={max ? "Restaurar" : "Maximizar"} onClick={() => api.winMaximize().then(setMax)}>
          {max ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.1">
              <rect x="1.5" y="3" width="6" height="6" /><path d="M3.5 3V1.5H9.5V7.5H8" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.1">
              <rect x="1.5" y="1.5" width="8" height="8" />
            </svg>
          )}
        </button>
        <button className="tb-btn close" title="Fechar" onClick={() => api.winClose()}>
          <svg width="11" height="11" viewBox="0 0 11 11" stroke="currentColor" strokeWidth="1.3">
            <path d="M1.5 1.5 L9.5 9.5 M9.5 1.5 L1.5 9.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
