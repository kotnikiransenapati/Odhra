import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  className?: string;
}

interface State {
  hasError: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SectionErrorBoundary caught:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className={`flex flex-col items-center justify-center py-8 px-4 text-center ${this.props.className || ''}`}>
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <p className="text-sm font-medium mb-1">
            {this.props.fallbackTitle || 'Something went wrong'}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            This section failed to load. Try refreshing.
          </p>
          <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
