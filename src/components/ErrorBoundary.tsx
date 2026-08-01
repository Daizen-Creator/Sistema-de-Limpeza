import { Component, type ReactNode } from "react";

/**
 * Rede de protecao: se qualquer tela lancar um erro em runtime, mostra uma
 * mensagem com botao de recarregar em vez de deixar a interface em branco
 * (evita o problema de "os botoes somem tudo").
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[NexusClean] erro capturado:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="err-boundary">
          <div className="err-card">
            <div className="err-ico">⚠️</div>
            <h2>Ops, algo travou nesta tela</h2>
            <p>A interface se recuperou. Recarregue para continuar — o backend continua rodando.</p>
            <div className="err-msg">{String(this.state.error?.message ?? this.state.error)}</div>
            <button className="btn primary" onClick={() => location.reload()}>Recarregar</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
