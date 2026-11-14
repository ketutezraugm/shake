import { Component, type ReactNode } from "react";

/** Without this a render error leaves a blank page. Offers and payments live on the chain, not on this page, so reloading is safe. */
export class CrashGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="page narrow">
        <section className="state-card left" role="alert">
          <p className="error state-title">This page hit a problem</p>
          <p className="muted">Your offers and any payment are recorded on the chain, not on this page, so reloading is safe.</p>
          <button className="outline-button" onClick={() => location.reload()}>
            Reload
          </button>
        </section>
      </main>
    );
  }
}
