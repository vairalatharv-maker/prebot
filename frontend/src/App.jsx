import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import './styles/route.css';

const Chat = lazy(() => import('./pages/Chat.jsx'));
const Assessment = lazy(() => import('./pages/Assessment.jsx'));
const MockInterview = lazy(() => import('./pages/MockInterview.jsx'));
const Roadmap = lazy(() => import('./pages/Roadmap.jsx'));

export default function App() {
  return <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
    <Route element={<ProtectedRoute />}><Route element={<AppLayout />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/chat" element={<Suspense fallback={<div className="route-loading" role="status">Loading PrepBot chat…</div>}><Chat /></Suspense>} />
      <Route path="/assessment" element={<Suspense fallback={<div className="route-loading" role="status">Loading your assessment…</div>}><Assessment /></Suspense>} />
      <Route path="/mock-interview" element={<Suspense fallback={<div className="route-loading" role="status">Loading mock interview…</div>}><MockInterview /></Suspense>} />
      <Route path="/roadmap" element={<Suspense fallback={<div className="route-loading" role="status">Loading your preparation roadmap…</div>}><Roadmap /></Suspense>} />
    </Route></Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}
