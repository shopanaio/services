"use client";

import { Alert, Button } from "antd";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  appCode: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppRuntimeBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[AdminApps] Remote render failed", {
      appCode: this.props.appCode,
      error,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <Alert
          type="error"
          showIcon
          message={`App "${this.props.appCode}" could not be rendered`}
          description={this.state.error.message}
          action={
            <Button size="small" onClick={() => this.setState({ error: null })}>
              Retry
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
