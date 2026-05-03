import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-on-background)] font-['Inter'] flex flex-col items-center justify-center p-6 text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border border-[var(--color-danger)]/30"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
              boxShadow: '0 0 40px rgba(239,68,68,0.15)',
            }}
          >
            <span className="material-symbols-outlined text-[42px] text-[var(--color-danger)]">
              error
            </span>
          </div>

          <h1 className="font-['Lexend'] text-2xl font-bold text-white mb-2">
            Что-то пошло не так
          </h1>
          <p className="text-[var(--color-on-surface-variant)] text-sm mb-1 leading-relaxed" style={{ maxWidth: '320px' }}>
            Произошла непредвиденная ошибка. Не переживай, данные в безопасности.
          </p>
          
          {this.state.error && (
            <p className="text-[10px] text-[var(--color-on-surface-variant)]/60 font-mono bg-white/5 px-3 py-1.5 rounded-lg mt-3 mb-6" style={{ maxWidth: '400px', wordBreak: 'break-all' }}>
              {this.state.error.message}
            </p>
          )}

          <button
            onClick={this.handleReset}
            className="mt-4 px-8 py-3 rounded-xl font-['Lexend'] font-bold uppercase tracking-wider text-[var(--color-on-primary)] transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #22C55E, #16A34A)',
              boxShadow: '0 0 20px rgba(34,197,94,0.3)',
            }}
          >
            На главную
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

