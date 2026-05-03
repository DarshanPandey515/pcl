import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
          <div className="text-center space-y-4 p-8">
            <p className="font-mono text-xs text-[var(--ink3)] tracking-widest uppercase">Error</p>
            <p className="font-serif italic text-2xl text-[var(--ink)] font-light">
              Something went wrong
            </p>
            <p className="font-mono text-xs text-[var(--ink3)]">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="font-mono text-xs text-[var(--amber)] border border-[var(--amber2)] px-4 py-2 rounded hover:bg-[var(--amber2)] hover:bg-opacity-10 transition-colors"
            >
              reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
