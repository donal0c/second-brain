import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  children: ReactNode;
  routeName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RouteErrorBoundaryClass extends Component<Props & { navigate: (path: string) => void }, State> {
  constructor(props: Props & { navigate: (path: string) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("RouteErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    this.props.navigate("/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {this.props.routeName ? `Error in ${this.props.routeName}` : "Page Error"}
                </h2>

                <p className="text-gray-600 mb-4">
                  This page encountered an error. You can try again or navigate to another page.
                </p>

                {this.state.error && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                      Error details
                    </summary>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-32 text-gray-800">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={this.handleReset}
                    className="bg-primary-hover text-white px-4 py-2 rounded-md hover:bg-primary-active transition-colors text-sm font-medium"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
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

export function RouteErrorBoundary(props: Props) {
  const navigate = useNavigate();
  return <RouteErrorBoundaryClass {...props} navigate={navigate} />;
}
