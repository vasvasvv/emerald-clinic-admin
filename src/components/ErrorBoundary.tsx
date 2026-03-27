import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen items-center justify-center bg-background p-8">
            <div className="glass-panel max-w-md p-8 text-center">
              <h2 className="mb-3 font-heading text-xl font-bold text-destructive">Щось пішло не так</h2>
              <p className="mb-4 text-sm text-muted-foreground">{this.state.error?.message ?? 'Невідома помилка'}</p>
              <button onClick={() => window.location.reload()} className="btn-accent">
                Перезавантажити
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
