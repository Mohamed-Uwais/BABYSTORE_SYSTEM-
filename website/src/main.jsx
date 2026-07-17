import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { CartProvider } from './context/CartContext';
import { PromoProvider } from './context/PromoContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <PromoProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </PromoProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
