import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('EasyPass error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="view error-fallback" style={{ padding: '24px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '12px' }}>Đã xảy ra lỗi</h2>
          <p style={{ marginBottom: '20px', color: 'var(--text-secondary, #888)' }}>
            {this.state.error?.message || 'Ứng dụng gặp sự cố không mong muốn.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Tải lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
