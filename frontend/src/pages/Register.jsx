import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false); const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => { event.preventDefault(); setError(''); if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; } setBusy(true); try { await register(form.name, form.email, form.password); navigate('/dashboard', { replace: true }); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <AuthLayout title="Create your account" subtitle="A little preparation goes a long way." alternate={{ to: '/login', text: 'Sign in' }} footer="Already have an account?">
    <form className="auth-form register-form" name="create-account" autoComplete="on" onSubmit={submit}>
      <label>Full name<span className="input-wrap"><UserRound size={17} /><input required minLength="2" maxLength="80" name="name" autoComplete="name" placeholder="Your name" value={form.name} onChange={change} /></span></label>
      <label>Email address<span className="input-wrap"><Mail size={17} /><input required name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={change} /></span></label>
      <div className="auth-password-field"><label htmlFor="register-password">Password</label><span className="input-wrap"><LockKeyhole size={17} /><input id="register-password" required minLength="8" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={change} /><button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></div>
      <div className="auth-password-field"><label htmlFor="confirm-password">Confirm password</label><span className="input-wrap"><LockKeyhole size={17} /><input id="confirm-password" required minLength="8" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter your password again" value={form.confirmPassword} onChange={change} /><button className="password-toggle" type="button" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((visible) => !visible)}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></div>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Creating account…' : <>Create account <ArrowRight size={17} /></>}</button>
      <p className="form-note">By continuing, you agree to keep your account details accurate.</p>
    </form>
  </AuthLayout>;
}
