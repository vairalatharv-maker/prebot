import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, BrainCircuit, Check, CheckCircle2, ChevronRight, Circle, Clock3, MessageSquareText, RotateCcw, Sparkles, Target, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import SectionArtwork from '../components/SectionArtwork.jsx';
import '../styles/roadmap.css';
import '../styles/roadmap-functional.css';

const RESULT_KEY = (userId) => `prepbot.assessment.latest.${userId || 'session'}`;
const PROGRESS_KEY = (userId) => `prepbot.roadmap.${userId || 'session'}`;
const safeRead = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const validScore = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100 ? Number(value) : null;

const categoryInfo = [
  { id: 'aptitude', label: 'Aptitude', route: '/assessment', icon: BrainCircuit },
  { id: 'dsa', label: 'Data structures & algorithms', route: '/chat', icon: BookOpen },
  { id: 'coreCS', label: 'Core computer science', route: '/chat', icon: BrainCircuit },
  { id: 'hr', label: 'Behavioral interview', route: '/mock-interview', icon: MessageSquareText },
];

function buildPlan(assessment) {
  const scores = assessment?.categoryScores || {};
  const ranked = categoryInfo.map((category) => ({ ...category, score: validScore(scores[category.id] ?? scores[category.label]) }))
    .filter((item) => item.score !== null).sort((a, b) => a.score - b.score);
  const focus = ranked.slice(0, 2);
  const focusTasks = focus.length ? focus.map((item) => ({ title: `Strengthen ${item.label}`, detail: `Your assessment suggests this is a useful area to focus on (${item.score}% baseline).`, route: item.route, action: 'Practice this area', icon: item.icon })) : [
    { title: 'Build your baseline', detail: 'Take the skill assessment to find your strongest topics and best next steps.', route: '/assessment', action: 'Start assessment', icon: Target },
  ];
  const weakAreas = Array.isArray(assessment?.weakAreas) ? assessment.weakAreas.filter((x) => typeof x === 'string').slice(0, 3) : [];
  const topicTasks = weakAreas.map((topic) => ({ title: `Review ${topic}`, detail: 'Revisit the concept, then explain it in your own words to lock it in.', route: '/chat', action: 'Ask PrepBot', icon: BookOpen }));
  const tasks = [
    { phase: '01', title: 'Get your starting point', subtitle: 'Understand where you are today.', items: [{ title: 'Complete a skill assessment', detail: 'Get a clear baseline across aptitude, DSA, core CS and behavioral questions.', route: '/assessment', action: 'Take assessment', icon: Target }] },
    { phase: '02', title: 'Focus on your growth areas', subtitle: 'Spend focused time on the topics that need attention.', items: [...focusTasks, ...topicTasks].slice(0, 4) },
    { phase: '03', title: 'Practice for interviews', subtitle: 'Turn preparation into confident, clear answers.', items: [
      { title: 'Run a mock interview', detail: 'Practice answering questions out loud and build a repeatable structure.', route: '/mock-interview', action: 'Start practice', icon: MessageSquareText },
      { title: 'Ask PrepBot what you are unsure about', detail: 'Use a quick question and follow-up to check your understanding.', route: '/chat', action: 'Open AI chatbot', icon: BrainCircuit },
    ] },
  ];
  return tasks;
}

export default function Roadmap() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const assessment = useMemo(() => safeRead(RESULT_KEY(userId)), [userId]);
  const plan = useMemo(() => buildPlan(assessment), [assessment]);
  const allTaskIds = plan.flatMap((phase) => phase.items.map((_, index) => `${phase.phase}-${index}`));
  const [done, setDone] = useState(() => {
    const saved = safeRead(PROGRESS_KEY(userId));
    return saved && typeof saved === 'object' ? saved : {};
  });
  const [heroSlide, setHeroSlide] = useState(0);
  const completeCount = allTaskIds.filter((id) => done[id]).length;
  const progress = allTaskIds.length ? Math.round(completeCount / allTaskIds.length * 100) : 0;

  const toggleTask = (id) => setDone((current) => {
    const next = { ...current, [id]: !current[id] };
    if (!next[id]) delete next[id];
    try { localStorage.setItem(PROGRESS_KEY(userId), JSON.stringify(next)); } catch { /* keep current-session progress if storage is unavailable */ }
    return next;
  });
  const resetProgress = () => {
    setDone({});
    try { localStorage.removeItem(PROGRESS_KEY(userId)); } catch { /* no-op */ }
  };

  const greetingName = user?.name?.trim().split(/\s+/)[0] || 'there';
  const focusNames = plan[1].items.map((item) => item.title.replace(/^Strengthen |^Review /, ''));
  const heroSlides = [
    { title: assessment ? `A plan that moves with you, ${greetingName}.` : 'A plan that moves with you.', description: assessment ? `Your roadmap is based on your latest ${validScore(assessment.overallScore) ?? 'skill'} assessment. Focus on ${focusNames.length ? focusNames.join(' and ') : 'one focused step'} and keep building momentum.` : 'Start with a skill assessment, then follow a clear plan to build your placement readiness.' },
    { title: 'Start with a clear baseline.', description: assessment ? `You have a starting score of ${validScore(assessment.overallScore) ?? '—'}%. Use it to see how your preparation grows.` : 'Take the skill assessment to discover your strengths and the topics to focus on next.' },
    { title: 'Focus on one skill at a time.', description: focusNames.length ? `Your next focus: ${focusNames.slice(0, 2).join(' and ')}. Small, regular practice builds lasting confidence.` : 'Choose a topic, practice it with PrepBot, and mark your progress as you go.' },
    { title: 'Practice for the moment that matters.', description: 'Try a mock interview, review what you know, and keep moving toward placement readiness.' },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setHeroSlide((current) => (current + 1) % heroSlides.length), 4500);
    return () => window.clearInterval(timer);
  }, [heroSlide, heroSlides.length]);

  return <div className="page-wrap roadmap-page roadmap-functional">
    <header className="page-topline roadmap-topline">
      <div><div className="eyebrow"><Sparkles size={14} /> PREPBOT · YOUR PLACEMENT COACH</div><h1>Preparation Roadmap</h1></div>
      <Link className="quiet-button" to={assessment ? '/chat' : '/assessment'}>{assessment ? 'Ask PrepBot' : 'Take assessment'} <ArrowRight size={15} /></Link>
    </header>

    <section className="roadmap-hero roadmap-functional-hero">
      <div className="roadmap-copy">
        <span className="roadmap-kicker">YOUR NEXT CHAPTER STARTS HERE</span>
        <div className="roadmap-carousel-viewport" aria-live="polite">
          <div className="roadmap-carousel-track" style={{ transform: `translateX(-${heroSlide * 100}%)` }}>
            {heroSlides.map((slide, index) => <div className="roadmap-carousel-slide" key={slide.title} aria-hidden={index !== heroSlide}>
              <h2>{slide.title}</h2><p>{slide.description}</p>
            </div>)}
          </div>
        </div>
        <div className="roadmap-progress roadmap-hero-progress" role="group" aria-label="Choose a roadmap highlight">{heroSlides.map((slide, index) => <button key={slide.title} type="button" className={index === heroSlide ? 'active' : ''} aria-label={`Show highlight ${index + 1}: ${slide.title}`} aria-current={index === heroSlide ? 'true' : undefined} onClick={() => setHeroSlide(index)}><span key={`${index}-${heroSlide === index}`} className={index === heroSlide ? 'roadmap-progress-fill is-playing' : 'roadmap-progress-fill'} /></button>)}</div>
      </div>
      <div className="roadmap-art"><SectionArtwork type="roadmap" className="roadmap-section-art" /></div>
    </section>

    <section className="roadmap-summary" aria-label="Roadmap progress">
      <div className="roadmap-summary-icon"><Trophy size={19} /></div>
      <div className="roadmap-summary-copy"><span className="mini-label">YOUR MOMENTUM</span><strong>{completeCount} of {allTaskIds.length} steps complete</strong><div className="roadmap-meter"><span style={{ width: `${progress}%` }} /></div></div>
      <span className="roadmap-summary-percent">{progress}%</span>
      {completeCount > 0 && <button className="roadmap-reset" type="button" onClick={resetProgress} aria-label="Reset roadmap progress" title="Reset progress"><RotateCcw size={15} /></button>}
    </section>

    <div className="roadmap-content-grid">
      <section className="roadmap-plan" aria-label="Your preparation plan">
        <div className="roadmap-section-heading"><div><span className="mini-label">YOUR PLAN</span><h2>One step at a time</h2></div><span><Clock3 size={14} /> Go at your own pace</span></div>
        {plan.map((phase) => <article className="roadmap-phase" key={phase.phase}>
          <div className="roadmap-phase-marker"><span>{phase.phase}</span><i /></div>
          <div className="roadmap-phase-body"><div className="roadmap-phase-heading"><div><h3>{phase.title}</h3><p>{phase.subtitle}</p></div>{phase.items.every((_, index) => done[`${phase.phase}-${index}`]) && <CheckCircle2 size={19} aria-label="Phase complete" />}</div>
            <div className="roadmap-task-list">{phase.items.map((item, index) => {
              const id = `${phase.phase}-${index}`;
              const Icon = item.icon;
              return <article className={`roadmap-task ${done[id] ? 'is-complete' : ''}`} key={id}>
                <button type="button" className="roadmap-task-check" onClick={() => toggleTask(id)} aria-label={`${done[id] ? 'Mark incomplete' : 'Mark complete'}: ${item.title}`} aria-pressed={Boolean(done[id])}>{done[id] ? <Check size={15} /> : <Circle size={17} />}</button>
                <span className="roadmap-task-icon"><Icon size={17} /></span>
                <div className="roadmap-task-copy"><h4>{item.title}</h4><p>{item.detail}</p></div>
                <Link className="roadmap-task-link" to={item.route}>{item.action} <ChevronRight size={14} /></Link>
              </article>;
            })}</div>
          </div>
        </article>)}
      </section>

      <aside className="roadmap-aside">
        <article className="roadmap-card roadmap-note"><span className="mini-label">A NOTE FROM PREPBOT</span><h3>Small steps add up.</h3><p>A little focused practice each day builds the confidence that lasts into your interviews.</p><div className="subtle-rule" /></article>
        <article className="roadmap-focus-card"><span className="roadmap-focus-icon"><Target size={17} /></span><span className="mini-label">YOUR CURRENT FOCUS</span><h3>{assessment ? (focusNames[0] || 'Keep your skills fresh') : 'Find your starting point'}</h3><p>{assessment ? `${assessment.weakAreas?.length ? 'Based on topics to strengthen in your assessment.' : 'Your assessment shows a balanced baseline. Keep practicing to stay sharp.'}` : 'Take an assessment and PrepBot will tailor your next steps.'}</p><Link to={assessment ? '/chat' : '/assessment'}>{assessment ? 'Study with PrepBot' : 'Start assessment'} <ArrowRight size={14} /></Link></article>
      </aside>
    </div>
  </div>;
}
