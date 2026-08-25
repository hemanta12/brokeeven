import { Component, type ErrorInfo, type PropsWithChildren } from 'react';

import { ErrorState } from './RouteStates';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.error) {
      return <ErrorState onRetry={() => this.setState({ error: null })} />;
    }

    return this.props.children;
  }
}
