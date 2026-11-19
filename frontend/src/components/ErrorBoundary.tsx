import { Component, type ReactNode } from "react";

// Any render error used to blank the whole app (no boundary). Show a way out instead.
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Screen crashed:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="text-lg font-semibold text-gray-900">Something went wrong</p>
        <p className="text-sm text-gray-500">Please reload the page. If it keeps happening, check your internet connection.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold"
        >
          Reload
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
