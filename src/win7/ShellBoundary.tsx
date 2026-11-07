"use client";
import React from "react";

function resetSavedState() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("win7."))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable */
  }
}

interface State {
  err: Error | null;
  info: string;
}

/**
 * Last line of defence for the shell. Windows 7 would show a recovery screen
 * rather than a black display, so if the desktop fails to mount we offer the
 * usual options: restart, reset the saved state, or copy the error details.
 */
export class ShellBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { err: null, info: "" };

  static getDerivedStateFromError(err: Error): Partial<State> {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    this.setState({ info: info.componentStack || "" });
    console.error("[win7] shell failed to start", err, info);
  }

  private restart = () => {
    this.setState({ err: null, info: "" });
    if (typeof window !== "undefined") window.location.reload();
  };

  private reset = () => {
    resetSavedState();
    if (typeof window !== "undefined") window.location.reload();
  };

  private copy = () => {
    const text = `${this.state.err?.name}: ${this.state.err?.message}\n${this.state.err?.stack || ""}\n${this.state.info}`;
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  render() {
    const { err } = this.state;
    if (!err) return this.props.children;
    return (
      <div className="bootfail" style={{ position: "fixed", inset: 0, zIndex: 120000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#0b1a2e", color: "#eaf2fb", fontFamily: '"Segoe UI", Tahoma, sans-serif' }}>
        <div className="bootfail-box" style={{ width: "min(640px, 100%)", padding: "22px 24px", borderRadius: 8, background: "rgba(12,26,46,.95)", border: "1px solid rgba(140,190,240,.45)", boxShadow: "0 18px 50px rgba(0,0,0,.6)" }}>
          <div className="bootfail-h">
            <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden>
              <circle cx="24" cy="24" r="20" fill="#c8102e" stroke="#7a0a18" strokeWidth="2" />
              <path d="M16 16l16 16M32 16L16 32" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <div>
              <b>Windows failed to start properly</b>
              <p>The desktop could not be displayed because of an unexpected error.</p>
            </div>
          </div>

          <div className="bootfail-msg">
            <code>{err.name}: {err.message}</code>
          </div>

          <p className="bootfail-hint">
            This is usually caused by saved settings from an older version of the simulation. Restarting reloads the
            desktop; resetting clears the saved files, settings and wallpapers stored in this browser.
          </p>

          <div className="bootfail-btns">
            <button className="w7btn def" onClick={this.restart}>Restart the desktop</button>
            <button className="w7btn" onClick={this.reset}>Reset saved state</button>
            <button className="w7btn" onClick={this.copy}>Copy error details</button>
          </div>
        </div>
      </div>
    );
  }
}

export default ShellBoundary;
