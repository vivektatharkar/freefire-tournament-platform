// frontend/src/components/ErrorBoundary.js
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // You can send this to a logging service (Sentry, your backend, etc.)
    console.error("Uncaught application error:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#020617",
            color: "#e5e7eb",
            padding: 20,
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: 420,
              background: "#0f172a",
              padding: 20,
              borderRadius: 14,
              boxShadow: "0 18px 40px rgba(0,0,0,0.75)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: "#9ca3af" }}>
              An unexpected error occurred. The problem has been logged. Please
              try reloading the page or come back later.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                marginTop: 12,
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(90deg,#22c55e,#38bdf8)",
                color: "#020617",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}