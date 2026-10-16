import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import { App } from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root 节点缺失，index.html 可能被改坏了');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
