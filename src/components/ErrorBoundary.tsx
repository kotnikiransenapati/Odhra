import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Headphones } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null, showDetails: false, errorCount: 0 };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    // Log error to backend for monitoring
    try {
      (supabase.from('error_logs' as any) as any).insert({
        error_level: 'error',
        message: error.message,
        stack_trace: error.stack?.slice(0, 2000),
        source: 'client_error_boundary',
        metadata: { componentStack: errorInfo.componentStack?.slice(0, 1000) },
      }).then(() => {});
    } catch {
      // Silently fail — logging should never break the app
    }
  }

  private handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      showDetails: false,
      errorCount: prev.errorCount + 1,
    }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4" role="alert">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto animate-pulse">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We're sorry for the inconvenience. This error has been noted. Please try again or return to the homepage.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                <Home className="w-4 h-4" /> Go Home
              </a>
            </div>

            {/* Contact support */}
            <a
              href="/contact"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
            >
              <Headphones className="w-3.5 h-3.5" />
              Contact Support
            </a>

            {/* Error details toggle */}
            {this.state.error && (
              <div className="text-left">
                <button
                  onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {this.state.showDetails ? 'Hide' : 'Show'} error details
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 text-xs bg-muted p-4 rounded-lg overflow-auto max-h-40 text-destructive border border-border/50">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\n${this.state.error.stack.split('\n').slice(0, 5).join('\n')}`}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
