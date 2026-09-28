import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BookOpenCheck, Bot, BrainCircuit, LayoutDashboard, LogOut, Menu, MessageSquareText, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { to: '/chat', label: 'AI Chatbot', icon: Bot },
  { to: '/assessment', label: 'Skill Assessment', icon: BrainCircuit }, { to: '/mock-interview', label: 'Mock Interview', icon: MessageSquareText },
  { to: '/roadmap', label: 'Preparation Roadmap', icon: BookOpenCheck },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = window.localStorage.getItem('prebot-theme');
    return savedTheme ? savedTheme === 'dark' : false;
  });
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const nextTheme = darkMode ? 'dark' : 'light';
    document.body.setAttribute('data-theme', nextTheme);
    window.localStorage.setItem('prebot-theme', nextTheme);
  }, [darkMode]);

  const signOut = () => { logout(); navigate('/login'); };

  return <>
    <button className="mobile-menu" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    {open && <button className="drawer-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand-wrap">
        <NavLink to="/dashboard" className="brand" onClick={() => setOpen(false)}><span className="brand-mark"><BrainCircuit size={20} /></span><span>PrepBot<span className="brand-period">.</span></span></NavLink>
        <button
          type="button"
          className="theme-toggle"
          aria-label={darkMode ? 'Switch to white mode' : 'Switch to dark mode'}
          aria-pressed={darkMode}
          onClick={() => setDarkMode((value) => !value)}
          title={darkMode ? 'Switch to white mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="side-nav">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></NavLink>)}</nav>
      <button className="logout-link" onClick={signOut}><LogOut size={18} strokeWidth={1.8} /><span>Log out</span></button>
      <div className="sidebar-foot"><div className="status-dot" />Your preparation space</div>
    </aside>
  </>;
}
