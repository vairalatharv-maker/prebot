import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, RotateCcw, Sparkles, Target, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import SectionArtwork from '../components/SectionArtwork.jsx';
import { buildInterviewQuestions, INTERVIEW_FORMATS, INTERVIEW_LEVELS, INTERVIEW_ROLES } from './interviewQuestions.js';
import '../styles/mock-interview.css';

const ANSWER_SECONDS = 150;
const SESSION_KEY = (userId) => `prepbot.mockinterview.latest.${userId || 'session'}`;

function parseSaved(userId) {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY(userId)) || 'null');
    return session && typeof session === 'object' && Array.isArray(session.questions) ? session : null;
  } catch { return null; }
}

function formatClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function buildSession(questions, answers, checks, secondsPerQuestion, setup) {
  const reviewed = checks.reduce((total, marks, index) => total + (answers[index]?.trim() ? marks.filter(Boolean).length : 0), 0);
  const available = questions.reduce((total, question, index) => total + (answers[index]?.trim() ? question.lookFor.length : 0), 0);
  return {
    role: setup.role,
    level: setup.level,
    format: setup.format,
    questions,
    answers,
    checks,
    reviewed,
    available,
    answered: answers.filter((answer) => answer?.trim()).length,
    completedAt: new Date().toISOString(),
    secondsPerQuestion,
  };
}

export default function MockInterview() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const [mode, setMode] = useState('setup');
  const [role, setRole] = useState(INTERVIEW_ROLES[0]);
  const [level, setLevel] = useState('standard');
  const [format, setFormat] = useState('mixed');
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState('answer');
  const [answers, setAnswers] = useState([]);
  const [checks, setChecks] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(ANSWER_SECONDS);
  const [session, setSession] = useState(null);
  const [savedSession, setSavedSession] = useState(() => parseSaved(userId));
  const [storageWarning, setStorageWarning] = useState(false);
  const currentQuestion = questions[questionIndex];
  const currentFormat = INTERVIEW_FORMATS.find((item) => item.id === format);
  const currentLevel = INTERVIEW_LEVELS.find((item) => item.id === level);
  const currentChecks = checks[questionIndex] || [];
  const progressPercent = questions.length ? (questionIndex + (phase === 'review' ? 1 : 0)) / questions.length * 100 : 0;

  const beginSession = () => {
    const selectedQuestions = buildInterviewQuestions(level, role, format);
    setQuestions(selectedQuestions);
    setQuestionIndex(0);
    setAnswers(Array(selectedQuestions.length).fill(''));
    setChecks(selectedQuestions.map((question) => Array(question.lookFor.length).fill(false)));
    setSecondsLeft(ANSWER_SECONDS);
    setStorageWarning(false);
    setMode('interview');
    setPhase('answer');
  };

  const finishSession = useCallback(() => {
    const completed = buildSession(questions, answers, checks, ANSWER_SECONDS, { role, level, format });
    setSession(completed);
    setSavedSession(completed);
    setMode('results');
    try { localStorage.setItem(SESSION_KEY(userId), JSON.stringify(completed)); }
    catch { setStorageWarning(true); }
  }, [questions, answers, checks, role, level, format, userId]);

  useEffect(() => {
    if (mode !== 'interview' || phase !== 'answer') return undefined;
    const timer = window.setInterval(() => setSecondsLeft((remaining) => {
      if (remaining <= 1) {
        window.clearInterval(timer);
        return 0;
      }
      return remaining - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [mode, phase, questionIndex]);

  const revealReview = () => setPhase('review');
  const updateAnswer = (value) => setAnswers((current) => current.map((answer, index) => index === questionIndex ? value : answer));
  const updateCheck = (checkIndex) => setChecks((current) => current.map((marks, index) => index === questionIndex ? marks.map((mark, itemIndex) => itemIndex === checkIndex ? !mark : mark) : marks));
  const nextQuestion = () => {
    if (questionIndex >= questions.length - 1) { finishSession(); return; }
    setQuestionIndex((index) => index + 1);
    setPhase('answer');
    setSecondsLeft(ANSWER_SECONDS);
  };
  const previousQuestion = () => {
    if (phase === 'review') { setPhase('answer'); return; }
    if (questionIndex > 0) {
      setQuestionIndex((index) => index - 1);
      setPhase('review');
      setSecondsLeft(ANSWER_SECONDS);
    }
  };

  const dateLabel = useMemo(() => {
    const date = savedSession?.completedAt ? new Date(savedSession.completedAt) : null;
    return date && !Number.isNaN(date.valueOf()) ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  }, [savedSession]);

  return <div className="page-wrap interview-page">
    <header className="page-topline interview-topline"><div><div className="eyebrow"><Sparkles size={14} /> PREPBOT · YOUR PLACEMENT COACH</div><h1>Mock Interview</h1></div>
      {mode === 'interview' && <div className={`interview-clock ${secondsLeft <= 20 ? 'interview-clock-overtime' : ''}`}><Clock3 size={15} /><strong>{formatClock(secondsLeft)}</strong><span>{secondsLeft === 0 ? 'take your time' : 'for this answer'}</span></div>}
    </header>

    {mode === 'setup' && <main className="interview-setup">
      <section className="interview-setup-hero"><div><span className="interview-kicker">PRACTICE WITH PURPOSE</span><h2>Get comfortable with the questions that move you forward.</h2><p>Choose a round, say your answer out loud or write it down, then review it against a practical interviewer checklist.</p></div><SectionArtwork type="interview" className="interview-section-art" /></section>
      <section className="interview-setup-grid">
        <div className="interview-setup-panel">
          <div className="interview-panel-heading"><span className="interview-panel-icon"><Target size={17} /></span><div><h3>Build your practice round</h3><p>Make it feel closer to the role you want.</p></div></div>
          <label className="interview-field-label" htmlFor="interview-role">Role focus</label>
          <select id="interview-role" className="interview-select" value={role} onChange={(event) => setRole(event.target.value)}>{INTERVIEW_ROLES.map((item) => <option key={item}>{item}</option>)}</select>
          <span className="interview-field-label">Interview format</span>
          <div className="interview-format-options">{INTERVIEW_FORMATS.map((item) => <button type="button" key={item.id} className={`interview-format-option ${format === item.id ? 'selected' : ''}`} onClick={() => setFormat(item.id)} aria-pressed={format === item.id}><span className="interview-radio-dot" /><span><strong>{item.label}</strong><small>{item.detail}</small></span></button>)}</div>
          <span className="interview-field-label">Difficulty</span>
          <div className="interview-level-options">{INTERVIEW_LEVELS.map((item) => <button type="button" key={item.id} className={`interview-level-option ${level === item.id ? 'selected' : ''}`} onClick={() => setLevel(item.id)} aria-pressed={level === item.id}><strong>{item.label}</strong><small>{item.detail}</small></button>)}</div>
          <div className="interview-session-note"><Clock3 size={15} /><span><strong>About 15 minutes</strong> · 6 questions · No pressure to get it perfect</span></div>
          <button type="button" className="primary-button interview-start-button" onClick={beginSession}>Start practice <ArrowRight size={17} /></button>
        </div>
        <aside className="interview-side-panel"><span className="interview-kicker">HOW IT WORKS</span><h3>Practice, reflect, improve.</h3><ol><li><span>1</span><div><strong>Make your answer</strong><p>Get a focused prompt and a couple of minutes to prepare.</p></div></li><li><span>2</span><div><strong>Compare against the signals</strong><p>Use a transparent checklist to reflect on what you covered.</p></div></li><li><span>3</span><div><strong>Keep what you learned</strong><p>See your practice notes at the end. Your answers stay on this device.</p></div></li></ol><div className="interview-honesty-note"><Sparkles size={15} /><p>Practice feedback is a self-review guide, not an AI grade or hiring prediction.</p></div></aside>
      </section>
      {savedSession && <button type="button" className="interview-previous-session" onClick={() => { setSession(savedSession); setMode('results'); }}><span className="interview-previous-icon"><Trophy size={17} /></span><span><strong>View your last practice round</strong><small>{savedSession.answered} answers saved{dateLabel ? ` · ${dateLabel}` : ''}</small></span><ArrowRight size={16} /></button>}
    </main>}

    {mode === 'interview' && currentQuestion && <main className="interview-session">
      <div className="interview-session-top"><div><span className={`interview-kind-tag ${currentQuestion.kind}`}>{currentQuestion.kind === 'technical' ? 'TECHNICAL' : 'BEHAVIORAL'} ROUND</span><span className="interview-session-topic">{currentQuestion.topic}</span></div><span className="interview-count">Question {questionIndex + 1} of {questions.length}</span></div>
      <div className="interview-progress" role="progressbar" aria-label="Interview progress" aria-valuemin="0" aria-valuemax={questions.length} aria-valuenow={questionIndex + (phase === 'review' ? 1 : 0)}><span style={{ width: `${progressPercent}%` }} /></div>
      <section className="interview-question-panel"><span className="interview-question-kicker">{phase === 'answer' ? 'TAKE A MOMENT, THEN ANSWER' : 'REFLECT ON YOUR ANSWER'}</span><h2>{currentQuestion.prompt}</h2>
        {phase === 'answer' ? <><p className="interview-answer-hint">You can answer aloud or use the notes box. Aim for a clear, specific response; the timer is just a practice guide.</p><label className="interview-answer-label" htmlFor="interview-answer">Your answer notes</label><textarea id="interview-answer" className="interview-answer-box" rows="6" maxLength="4000" value={answers[questionIndex] || ''} onChange={(event) => updateAnswer(event.target.value)} placeholder="Capture your main points here, or speak your response out loud…"/><div className="interview-answer-meta"><span>{(answers[questionIndex] || '').trim().split(/\s+/).filter(Boolean).length} words</span><span>{currentLevel.label} · {role}</span></div><button type="button" className="primary-button interview-review-button" onClick={revealReview}>Review my answer <ArrowRight size={16} /></button></> : <><p className="interview-answer-hint">Select the points your response covered. This is a reflection guide—there is no hidden or automated score.</p><div className="interview-checklist">{currentQuestion.lookFor.map((item, index) => <label className={`interview-check-item ${currentChecks[index] ? 'checked' : ''}`} key={item}><input type="checkbox" checked={Boolean(currentChecks[index])} onChange={() => updateCheck(index)} /><span className="interview-check-box"><Check size={13} /></span><span>{item}</span></label>)}</div><div className="interview-reflection"><strong>One thing to improve</strong><p>Could you make your example more specific, explain your reasoning, or finish with the outcome?</p></div><button type="button" className="primary-button interview-review-button" onClick={nextQuestion}>{questionIndex === questions.length - 1 ? 'Finish practice' : 'Next question'} <ArrowRight size={16} /></button></>}
      </section>
      <footer className="interview-controls"><button type="button" className="interview-back-button" onClick={previousQuestion}><ArrowLeft size={15} /> Back</button><span>{format === 'mixed' ? currentFormat.detail : currentFormat.label} · {currentLevel.label}</span><button type="button" className="interview-skip-button" onClick={phase === 'answer' ? revealReview : nextQuestion}>{phase === 'answer' ? 'Skip answer' : questionIndex === questions.length - 1 ? 'Finish' : 'Continue'} <ArrowRight size={14} /></button></footer>
    </main>}

    {mode === 'results' && session && <main className="interview-results">
      <section className="interview-result-hero"><span className="interview-result-trophy"><Trophy size={22} /></span><div><span className="interview-kicker">PRACTICE ROUND COMPLETE</span><h2>Good work showing up.</h2><p>Use your notes to make the next answer a little stronger.</p></div><div className="interview-result-count"><strong>{session.answered}<span>/{session.questions.length}</span></strong><small>answers captured</small></div></section>
      <section className="interview-results-grid"><article className="interview-reflection-card"><span className="interview-kicker">YOUR SELF-REVIEW</span><h3>{session.reviewed}<span>/{session.available || session.questions.reduce((sum, item) => sum + item.lookFor.length, 0)}</span></h3><p>interviewer signals you marked in your answered questions</p><div className="interview-review-meter"><span style={{ width: `${session.available ? session.reviewed / session.available * 100 : 0}%` }} /></div></article><article className="interview-reflection-card interview-reflection-tip"><span className="interview-kicker">A SIMPLE NEXT STEP</span><h3>Pick one answer to sharpen</h3><p>Choose the response with the fewest checklist points. Add a concrete example and the outcome you achieved.</p></article></section>
      <section className="interview-answer-summary"><div className="interview-summary-heading"><span className="interview-kicker">YOUR PRACTICE NOTES</span><button type="button" onClick={() => setMode('setup')}>New practice round</button></div>{session.questions.map((item, index) => <article className="interview-summary-item" key={`${item.topic}-${index}`}><span className={`interview-summary-number ${item.kind}`}>{String(index + 1).padStart(2, '0')}</span><div><span>{item.kind} · {item.topic}</span><h4>{item.prompt}</h4><p>{session.answers[index]?.trim() || 'No answer notes saved for this question.'}</p><small>{(session.checks[index] || []).filter(Boolean).length} of {item.lookFor.length} reflection points marked</small></div></article>)}</section>
      {storageWarning && <p className="interview-storage-warning" role="status">This round is visible here, but browser storage prevented saving it for later.</p>}
      <footer className="interview-result-actions"><p><ShieldCheck size={15} /> Your answers are saved in this browser on this device.</p><button type="button" className="primary-button interview-start-button" onClick={() => setMode('setup')}><RotateCcw size={15} /> Practice again</button></footer>
    </main>}
  </div>;
}
