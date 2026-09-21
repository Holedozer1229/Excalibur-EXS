import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = { error: Error | null };

/** Keeps SphinxOS faucet-lab UI up if Solana wallet chunk fails to boot. */
export default class SolanaErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Solana section failed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
            data-testid="solana-error-fallback"
          >
            <strong className="text-destructive">Solana wallet failed to load.</strong>{" "}
            <span className="text-muted-foreground">
              {this.state.error.message}. Faucet lab EVM steps above still work — retry after refresh,
              or open Phantom on Devnet directly.
            </span>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
