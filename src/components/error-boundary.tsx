'use client';
import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-red-100 bg-red-50 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
            <p className="mt-1 text-sm text-gray-500">{this.state.message || 'An unexpected error occurred.'}</p>
          </div>
          <Button variant="outline" onClick={() => this.setState({ hasError: false, message: '' })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
