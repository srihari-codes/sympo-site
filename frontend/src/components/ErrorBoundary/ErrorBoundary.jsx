import React from "react";
import "./ErrorBoundary.scss";

/*
 * Stops one broken subtree from taking the whole site down.
 *
 * Without a boundary, any error thrown while rendering — or inside a lifecycle
 * — unmounts the entire React tree, which is what a "the page just goes blank"
 * report actually is. React only prints the reason to the console, so unless
 * devtools happen to be open the failure is completely silent.
 *
 * This catches it, keeps the rest of the site alive, and puts the error and its
 * component stack on screen where they can be read and reported.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Keep the console trace too, for anyone who does have devtools open.
    console.error(`[${this.props.label || "app"}] crashed:`, error, info);
  }

  handleDismiss = () => this.setState({ error: null, info: null });

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="eb">
        <div className="eb__panel" role="alert">
          <p className="eb__tag">{this.props.label || "Something"} failed to render</p>

          <h2 className="eb__message">
            {error.name}: {error.message}
          </h2>

          {info?.componentStack && (
            <pre className="eb__stack">{info.componentStack.trim()}</pre>
          )}

          <p className="eb__hint">
            The rest of the site is still running. Copy the text above when
            reporting this.
          </p>

          <button className="eb__close" type="button" onClick={this.handleDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
