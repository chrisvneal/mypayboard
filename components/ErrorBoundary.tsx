'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MyPayBoard: render error', error.message, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-border bg-(--bg-primary) p-8 text-center shadow-(--shadow-sm)">
          <h2 className="text-lg font-semibold text-(--text-primary)">Something went wrong</h2>
          <p className="mt-2 text-sm text-(--text-secondary)">
            Try refreshing the page. If the problem continues, check the browser console for details.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 cursor-pointer rounded-md border border-border bg-(--bg-secondary) px-4 py-2 text-sm font-medium text-(--text-primary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary)"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
