import { Component } from 'react';
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('[RENDER_ERROR]', error.name); }
  render() {
    if (this.state.failed) return <div role="alert" className="p-6 text-center text-slate-500">
      <p>Something went wrong. Please reload to try again.</p>
      <button type="button" className="mt-3 underline" onClick={() => window.location.reload()}>Reload</button>
    </div>;
    return this.props.children;
  }
}
