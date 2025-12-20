/**
 * Copilot Error Boundary
 *
 * Catches React errors in the copilot interface.
 * Feature: 007-observation-copilot
 */

import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class CopilotErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("Copilot error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex items-center justify-center h-full p-8">
					<div className="text-center border border-matrix-alert bg-matrix-dark p-6 rounded">
						<AlertTriangle className="w-12 h-12 text-matrix-alert mx-auto mb-4" />
						<h2 className="text-lg font-bold text-matrix-text mb-2">
							COPILOT ERROR
						</h2>
						<p className="text-sm text-matrix-dim mb-4">
							Something went wrong with the copilot interface.
						</p>
						<button
							type="button"
							onClick={() => this.setState({ hasError: false, error: null })}
							className="bg-matrix-dim border border-matrix-text text-matrix-text px-4 py-2 rounded hover:bg-matrix-text hover:text-matrix-dark transition-colors"
						>
							Try Again
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
