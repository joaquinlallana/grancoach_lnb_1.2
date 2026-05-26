import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info)
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback
      }
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 mb-4">
              <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">
              Algo salió mal
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
              Se produjo un error inesperado. Probá recargar la página; si el problema persiste,
              avisanos para solucionarlo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="primary" iconLeft={RefreshCw} onClick={this.handleReload}>
                Recargar
              </Button>
              <Button variant="ghost" onClick={this.handleReset}>
                Volver a intentar
              </Button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 text-left text-xs text-rose-500 bg-rose-500/5 border border-rose-500/20 rounded-lg p-3 overflow-auto max-h-48">
                {String(this.state.error?.stack || this.state.error)}
              </pre>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
