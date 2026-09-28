import { useState } from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => { event.preventDefault(); setError(''); setBusy(true); try { await login(form.email, form.password); navigate(location.state?.from || '/dashboard', { replace: true }); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <AuthLayout title="Welcome back" subtitle="Sign in to pick up where you left off." alternate={{ to: '/register', text: 'Create an account' }} footer="New to PrepBot?">
    <form className="auth-form" onSubmit={submit}>
      <label>Email address<span className="input-wrap"><Mail size={17} /><input required name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={change} /></span></label>
      <label>Password<span className="input-wrap"><LockKeyhole size={17} /><input required name="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={change} /></span></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Signing in…' : <>Sign in <ArrowRight size={17} /></>}</button>
      <p className="form-note">Secure sign-in · Your password is never stored in your browser.</p>
    </form>
  </AuthLayout>;
}
