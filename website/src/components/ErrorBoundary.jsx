import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, countdown: 3 };
  }

  static getDerivedStateFromError() {
    return { hasError: true, countdown: 3 };
  }

  componentDidUpdate(_, prevState) {
    if (this.state.hasError && !prevState.hasError) {
      this.timer = setInterval(() => {
        this.setState(s => {
          if (s.countdown <= 1) {
            clearInterval(this.timer);
            window.location.href = '/';
            return s;
          }
          return { countdown: s.countdown - 1 };
        });
      }, 1000);
    }
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
          <span className="mb-4 text-5xl">😔</span>
          <h2 className="text-xl font-bold text-slate-800">Something went wrong</h2>
          <p className="mt-2 text-sm text-slate-500">
            Redirecting to home in {this.state.countdown}s...
          </p>
          <a
            href="/"
            className="mt-6 rounded-full bg-primary-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            Go to Home
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
