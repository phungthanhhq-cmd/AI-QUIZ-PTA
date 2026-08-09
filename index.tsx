import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '600px', margin: '4rem auto', backgroundColor: '#ffffff', borderRadius: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h1 style={{ color: '#dc2626', fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>Ứng dụng gặp sự cố khởi chạy</h1>
          <p style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'Có lỗi xảy ra khi tải ứng dụng. Vui lòng tải lại trang.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
