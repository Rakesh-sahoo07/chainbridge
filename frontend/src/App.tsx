import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import { WalletProvider } from './contexts/WalletContext';
import { ToastProvider } from './contexts/ToastContext';
import { HomePage } from './components/HomePage';
import { SwapPage } from './components/SwapPage';
import Toast from './components/Toast';

function App() {
  return (
    <WalletProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/swap" element={<SwapPage />} />
          </Routes>
          <Toast />
        </Router>
      </ToastProvider>
    </WalletProvider>
  );
}

export default App;