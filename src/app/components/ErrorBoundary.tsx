"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-2xl border border-red-900/60 bg-red-950/40 px-6 py-8 text-red-200">
            <div className="flex items-start gap-4">
              <svg
                className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-red-100 mb-2">
                  Something went wrong
                </h2>
                <p className="text-sm mb-4">
                  {this.state.error?.message || "An unexpected error occurred."}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={this.handleReset}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-red-800 bg-red-900/30 text-red-200 hover:bg-red-900/50 transition-colors min-h-[44px]"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.href = "/"}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-red-800 bg-red-900/30 text-red-200 hover:bg-red-900/50 transition-colors min-h-[44px]"
                  >
                    Go Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
