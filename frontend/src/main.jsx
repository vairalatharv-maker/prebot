import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/global.css';
import './styles/sidebar.css';
import './styles/layout-fixes.css';
import './styles/theme.css';
import './styles/section-artwork.css';

const savedTheme = window.localStorage.getItem('prebot-theme');
document.body.setAttribute('data-theme', savedTheme === 'dark' ? 'dark' : 'light');

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></React.StrictMode>);
