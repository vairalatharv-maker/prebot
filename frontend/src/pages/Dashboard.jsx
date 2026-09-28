import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BookOpenCheck, BrainCircuit, Check, CircleHelp, Compass, Flame, Gauge, MessageSquareText, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import SectionArtwork from '../components/SectionArtwork.jsx';
import '../styles/dashboard.css';

const RESULT_KEY = (userId) => `prepbot.assessment.latest.${userId}`;
const SPRINT_KEY = (userId) => `prepbot.sprint.${userId}`;
const asScore = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100 ? Number(value) : null;

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}

function readAssessment(userId) {
  if (!userId) return null;
  const result = readJson(RESULT_KEY(userId));
  if (!result || typeof result !== 'object') return null;
  const categories = result.categoryScores || {};
  const aptitude = asScore(categories.aptitude ?? categories.Aptitude);
  const dsa = asScore(categories.dsa ?? categories.DSA);
  const coreCS = asScore(categories.coreCS ?? categories.core_cs ?? categories['Core CS']);
  const hr = asScore(categories.hr ?? categories.behavioral ?? categories['HR / Behavioral'] ?? categories.HR);
  const techValues = [dsa, coreCS].filter((score) => score !== null);
  return {
    overall: asScore(result.overallScore ?? result.overall),
    technical: techValues.length ? Math.round(techValues.reduce((sum, score) => sum + score, 0) / techValues.length) : null,
    aptitude,
    hr,
    strongAreas: Array.isArray(result.strongAreas) ? result.strongAreas.filter((item) => typeof item === 'string').slice(0, 4) : [],
    weakAreas: Array.isArray(result.weakAreas) ? result.weakAreas.filter((item) => typeof item === 'string').slice(0, 4) : [],
  };
}

function readSprint(userId) {
  const sprint = userId ? readJson(SPRINT_KEY(userId)) : null;
  if (!sprint || typeof sprint !== 'object') return null;
  const progress = asScore(sprint.progress);
  const weeklyChange = Number.isFinite(Number(sprint.weeklyChange)) ? Number(sprint.weeklyChange) : null;
  return { focus: typeof sprint.focus === 'string' ? sprint.focus : 'Your learning sprint', progress, weeklyChange };
}

function MetricCard({ icon: Icon, label, value, note, tone }) {
  return <article className="dash-metric-card">
    <div className="dash-metric-heading"><span className={`dash-metric-icon ${tone}`}><Icon size={17} /></span><span>{label}</span></div>
    <div className="dash-metric-value">{value === null ? '—' : `${value}%`}</div>
    <p>{note}</p>
    {value !== null && <div className="dash-meter" aria-label={`${label}: ${value}%`}><span style={{ width: `${value}%` }} /></div>}
  </article>;
}

function TopicCard({ title, description, topics, kind }) {
  const isStrong = kind === 'strong';
  const Icon = isStrong ? Check : Target;
  return <article className={`dash-topic-card ${isStrong ? 'topic-strong' : 'topic-focus'}`}>
    <div className="dash-section-title"><span className={`dash-topic-icon ${isStrong ? 'topic-icon-strong' : 'topic-icon-focus'}`}><Icon size={16} /></span><div><h2>{title}</h2><p>{description}</p></div></div>
    {topics.length ? <ul className="dash-topic-list">{topics.map((topic) => <li key={topic}><span className="topic-bullet" />{topic}</li>)}</ul> : <div className="dash-empty-topics"><CircleHelp size={17} /><span>Complete a skill assessment to see your {isStrong ? 'strong topics' : 'recommended focus areas'} here.</span></div>}
  </article>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const assessment = useMemo(() => readAssessment(userId), [userId]);
  const sprint = useMemo(() => readSprint(userId), [userId]);
  const sprintProgress = sprint?.progress ?? 0;
  const greetingName = user?.name?.trim() || 'there';

  return <div className="page-wrap dashboard-page">
    <header className="page-topline dashboard-topline">
      <div><div className="eyebrow"><Sparkles size={14} /> PREPBOT · YOUR PLACEMENT COACH</div><h1>Dashboard</h1></div>
      <Link className="quiet-button dashboard-top-action" to="/roadmap">View roadmap <ArrowUpRight size={15} /></Link>
    </header>

    <section className="dash-hero">
      <div className="dash-hero-copy">
        <div className="dash-hero-eyebrow"><Sparkles size={14} /> AI PLACEMENT COACH</div>
        <h2>Welcome back,<br className="dash-name-break" /> {greetingName} <span aria-hidden="true">👋</span></h2>
        <p>Your preparation space is ready. Build steady momentum, one focused step at a time.</p>
        <div className="dash-hero-actions">
          <Link className="primary-button dash-primary-action" to={assessment ? '/chat' : '/assessment'}>{assessment ? 'Continue prep' : 'Take your first assessment'} <ArrowRight size={16} /></Link>
          <Link className="dash-secondary-action" to="/roadmap"><BookOpenCheck size={16} /> View roadmap</Link>
        </div>
      </div>
      <div className="dash-sprint-card">
        <div className="dash-sprint-head"><span className="dash-sprint-symbol"><Flame size={17} /></span><span>LEARNING SPRINT</span>{sprint && <span className="dash-live-dot" />}</div>
        <div className="dash-sprint-label">{sprint ? 'CURRENT FOCUS' : 'READY WHEN YOU ARE'}</div>
        <h3>{sprint?.focus || assessment?.weakAreas[0] || 'Build your baseline'}</h3>
        <p>{sprint ? 'Keep a little time aside each day to make progress.' : 'Start with a skill assessment to find your best next step.'}</p>
        <div className="dash-sprint-progress-row"><span>{sprint ? 'Sprint progress' : 'Not started'}</span><strong>{sprint ? `${sprintProgress}%` : '—'}</strong></div>
        <div className="dash-sprint-meter"><span style={{ width: `${sprintProgress}%` }} /></div>
        <div className="dash-sprint-foot">{sprint?.weeklyChange !== null && sprint?.weeklyChange !== undefined ? <span className="dash-growth"><TrendingUp size={14} /> {sprint.weeklyChange >= 0 ? '+' : ''}{sprint.weeklyChange}% this week</span> : <span className="dash-sprint-foot-muted">A steady pace beats a perfect plan.</span>}<span className="dash-sprint-mark"><BrainCircuit size={16} /></span></div>
      </div>
      <div className="dash-hero-orbit dash-orbit-a" aria-hidden="true" /><div className="dash-hero-orbit dash-orbit-b" aria-hidden="true" />
    </section>

    <section className="dash-section">
      <div className="dash-section-header"><div><span className="dash-section-kicker">YOUR PROGRESS</span><h2>Readiness at a glance</h2></div><div className="dash-section-header-side"><SectionArtwork type="dashboard" className="dash-section-art" /><span className="dash-data-note"><span /> Based on your latest assessment</span></div></div>
      <div className="dash-metric-grid">
        <MetricCard icon={Gauge} label="Overall readiness" value={assessment?.overall ?? null} note={assessment ? 'From your latest assessment' : 'Complete an assessment to get your score'} tone="purple" />
        <MetricCard icon={BrainCircuit} label="Technical score" value={assessment?.technical ?? null} note={assessment ? 'DSA and core CS average' : 'Waiting for your first assessment'} tone="blue" />
        <MetricCard icon={Compass} label="Aptitude score" value={assessment?.aptitude ?? null} note={assessment ? 'Aptitude category' : 'Waiting for your first assessment'} tone="green" />
        <MetricCard icon={MessageSquareText} label="HR score" value={assessment?.hr ?? null} note={assessment ? 'HR / behavioral category' : 'Waiting for your first assessment'} tone="orange" />
      </div>
    </section>

    <section className="dash-topic-grid">
      <TopicCard title="Strong topics" description="Build on what you already know." topics={assessment?.strongAreas || []} kind="strong" />
      <TopicCard title="Focus areas" description="Turn your next gaps into strengths." topics={assessment?.weakAreas || []} kind="focus" />
    </section>

    {!assessment && <aside className="dash-assessment-nudge"><span className="dash-nudge-icon"><Target size={17} /></span><div><strong>Your dashboard gets personal after your first assessment.</strong><p>It takes about 30 minutes and helps PrepBot recommend what to focus on next.</p></div><Link to="/assessment" className="dash-nudge-link">Start assessment <ArrowRight size={15} /></Link></aside>}
  </div>;
}
