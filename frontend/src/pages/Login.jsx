import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => { event.preventDefault(); setError(''); setBusy(true); try { await login(form.email, form.password); navigate(location.state?.from || '/dashboard', { replace: true }); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <AuthLayout title="Welcome back" subtitle="Sign in to pick up where you left off." alternate={{ to: '/register', text: 'Create an account' }} footer="New to PrepBot?">
    <form className="auth-form" name="login" autoComplete="on" onSubmit={submit}>
      <label htmlFor="login-email">Email address<span className="input-wrap"><Mail size={17} /><input id="login-email" required name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck="false" placeholder="you@example.com" value={form.email} onChange={change} /></span></label>
      <div className="auth-password-field"><label htmlFor="login-password">Password</label><span className="input-wrap"><LockKeyhole size={17} /><input id="login-password" required name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={change} /><button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></div>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Signing in…' : <>Sign in <ArrowRight size={17} /></>}</button>
      <p className="form-note">Secure sign-in · Your browser may offer to save your password.</p>
    </form>
  </AuthLayout>;
}
