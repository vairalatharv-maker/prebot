import { useState } from 'react';
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => { event.preventDefault(); setError(''); if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; } setBusy(true); try { await register(form.name, form.email, form.password); navigate('/dashboard', { replace: true }); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <AuthLayout title="Create your account" subtitle="A little preparation goes a long way." alternate={{ to: '/login', text: 'Sign in' }} footer="Already have an account?">
    <form className="auth-form register-form" onSubmit={submit}>
      <label>Full name<span className="input-wrap"><UserRound size={17} /><input required minLength="2" maxLength="80" name="name" autoComplete="name" placeholder="Your name" value={form.name} onChange={change} /></span></label>
      <label>Email address<span className="input-wrap"><Mail size={17} /><input required name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={change} /></span></label>
      <label>Password<span className="input-wrap"><LockKeyhole size={17} /><input required minLength="8" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={change} /></span></label>
      <label>Confirm password<span className="input-wrap"><LockKeyhole size={17} /><input required minLength="8" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Enter your password again" value={form.confirmPassword} onChange={change} /></span></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Creating account…' : <>Create account <ArrowRight size={17} /></>}</button>
      <p className="form-note">By continuing, you agree to keep your account details accurate.</p>
    </form>
  </AuthLayout>;
}
