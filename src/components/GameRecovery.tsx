import { Component, type ErrorInfo, type ReactNode } from "react";

type RecoveryReason = "invalid-route" | "unexpected-error";

export function GameRecovery({ reason }: { reason: RecoveryReason }) {
  const message = reason === "invalid-route"
    ? "The current game location is invalid. Reload the game to restore the last stable state."
    : "GOF2 encountered an unexpected error. Reload the game to restore the last stable state.";

  return (
    <section
      className="modal-screen static-screen recovery-screen"
      data-recovery-reason={reason}
      data-testid="game-recovery"
      role="alert"
    >
      <div className="modal-panel recovery-panel">
        <p className="eyebrow">Recovery mode</p>
        <h2>Unable to continue</h2>
        <p>{message} Your browser saves have not been changed.</p>
        <button className="primary" type="button" onClick={() => window.location.reload()}>
          Reload game
        </button>
      </div>
    </section>
  );
}

type GameErrorBoundaryProps = {
  children: ReactNode;
};

type GameErrorBoundaryState = {
  hasError: boolean;
};

export class GameErrorBoundary extends Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
  state: GameErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GameErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("GOF2 recovered from an unexpected render error.", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return <GameRecovery reason="unexpected-error" />;
    return this.props.children;
  }
}
