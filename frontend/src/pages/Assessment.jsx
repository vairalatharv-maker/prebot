import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, RotateCcw, ShieldCheck, Sparkles, Target, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import SectionArtwork from '../components/SectionArtwork.jsx';
import { ASSESSMENT_CATEGORIES, ASSESSMENT_QUESTIONS } from './assessmentQuestions.js';
import '../styles/assessment.css';

const TIME_LIMIT_SECONDS = 30 * 60;
const RESULT_KEY = (userId) => `prepbot.assessment.latest.${userId || 'session'}`;
const CATEGORY_LABEL = Object.fromEntries(ASSESSMENT_CATEGORIES.map(({ id, label }) => [id, label]));

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function createResult(answers, elapsedSeconds) {
  const categories = Object.fromEntries(ASSESSMENT_CATEGORIES.map(({ id }) => [id, { correct: 0, total: 0 }]));
  const topics = {};
  let correctAnswers = 0;
  ASSESSMENT_QUESTIONS.forEach((question, index) => {
    const isCorrect = answers[index] === question.answer;
    categories[question.category].total += 1;
    if (isCorrect) {
      categories[question.category].correct += 1;
      correctAnswers += 1;
    }
    const topic = topics[question.topic] ||= { correct: 0, total: 0 };
    topic.total += 1;
    if (isCorrect) topic.correct += 1;
  });
  const categoryScores = Object.fromEntries(Object.entries(categories).map(([id, value]) => [id, Math.round(value.correct / value.total * 100)]));
  const topicEntries = Object.entries(topics).map(([name, score]) => ({ name, percentage: score.correct / score.total * 100 }));
  const strongAreas = topicEntries.filter(({ percentage }) => percentage >= 75).sort((a, b) => b.percentage - a.percentage).map(({ name }) => name).slice(0, 5);
  const weakAreas = topicEntries.filter(({ percentage }) => percentage < 50).sort((a, b) => a.percentage - b.percentage).map(({ name }) => name).slice(0, 5);
  return {
    overallScore: Math.round(correctAnswers / ASSESSMENT_QUESTIONS.length * 100),
    categoryScores,
    strongAreas,
    weakAreas,
    correctAnswers,
    totalQuestions: ASSESSMENT_QUESTIONS.length,
    elapsedSeconds,
    completedAt: new Date().toISOString(),
  };
}

function readSavedResult(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(RESULT_KEY(userId)) || 'null');
    return saved && typeof saved === 'object' && Number.isFinite(Number(saved.overallScore)) ? saved : null;
  } catch { return null; }
}

function CategoryScores({ result }) {
  return <div className="assessment-score-grid">{ASSESSMENT_CATEGORIES.map((category) => {
    const score = result.categoryScores[category.id] ?? 0;
    return <article className={`assessment-score-card assessment-tone-${category.color}`} key={category.id}>
      <div><span>{category.label}</span><strong>{score}%</strong></div>
      <div className="assessment-score-track"><span style={{ width: `${score}%` }} /></div>
    </article>;
  })}</div>;
}

export default function Assessment() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const savedResult = useMemo(() => readSavedResult(userId), [userId]);
  const [mode, setMode] = useState('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT_SECONDS);
  const [result, setResult] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewAvailable, setReviewAvailable] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const answersRef = useRef(answers);
  const transitionLockRef = useRef(false);
  const transitionTimeoutRef = useRef(null);
  answersRef.current = answers;
  const question = ASSESSMENT_QUESTIONS[currentIndex];
  const category = ASSESSMENT_CATEGORIES.find(({ id }) => id === question?.category);
  const answeredCount = Object.keys(answers).length;
  const categoryQuestionIndex = ASSESSMENT_QUESTIONS.slice(0, currentIndex).filter((item) => item.category === question?.category).length + 1;
  const categoryQuestionCount = ASSESSMENT_QUESTIONS.filter((item) => item.category === question?.category).length;

  const completeAssessment = useCallback((submittedAnswers = answersRef.current) => {
    if (transitionTimeoutRef.current) window.clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = null;
    transitionLockRef.current = false;
    setTransitioning(false);
    const finalResult = createResult(submittedAnswers, TIME_LIMIT_SECONDS - secondsLeft);
    setResult(finalResult);
    setReviewAvailable(true);
    setMode('results');
    setConfirmSubmit(false);
    try { localStorage.setItem(RESULT_KEY(userId), JSON.stringify(finalResult)); }
    catch { setStorageWarning(true); }
  }, [secondsLeft, userId]);

  useEffect(() => () => {
    if (transitionTimeoutRef.current) window.clearTimeout(transitionTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (mode !== 'quiz') return undefined;
    const intervalId = window.setInterval(() => setSecondsLeft((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => window.clearInterval(intervalId);
  }, [mode]);

  useEffect(() => {
    if (mode === 'quiz' && secondsLeft === 0) completeAssessment();
  }, [mode, secondsLeft, completeAssessment]);

  const startAssessment = () => {
    if (transitionTimeoutRef.current) window.clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = null;
    transitionLockRef.current = false;
    setTransitioning(false);
    answersRef.current = {};
    setAnswers({});
    setCurrentIndex(0);
    setSecondsLeft(TIME_LIMIT_SECONDS);
    setResult(null);
    setShowReview(false);
    setReviewAvailable(false);
    setConfirmSubmit(false);
    setStorageWarning(false);
    setMode('quiz');
  };

  const selectAnswer = (answerIndex) => {
    if (transitionLockRef.current || mode !== 'quiz') return;
    transitionLockRef.current = true;
    setTransitioning(true);
    const submittedAnswers = { ...answersRef.current, [currentIndex]: answerIndex };
    answersRef.current = submittedAnswers;
    setAnswers(submittedAnswers);
    setConfirmSubmit(false);
    transitionTimeoutRef.current = window.setTimeout(() => {
      transitionTimeoutRef.current = null;
      if (currentIndex === ASSESSMENT_QUESTIONS.length - 1) {
        completeAssessment(submittedAnswers);
        return;
      }
      transitionLockRef.current = false;
      setTransitioning(false);
      setCurrentIndex((index) => Math.min(index + 1, ASSESSMENT_QUESTIONS.length - 1));
    }, 400);
  };
  const goToQuestion = (index) => {
    if (transitionLockRef.current) return;
    setCurrentIndex(index);
    setConfirmSubmit(false);
  };

  return <div className="page-wrap assessment-page">
    <header className="page-topline assessment-topline">
      <div><div className="eyebrow"><Sparkles size={14} /> PREPBOT · YOUR PLACEMENT COACH</div><h1>Skill Assessment</h1></div>
      {mode === 'quiz' && <div className={`assessment-timer ${secondsLeft < 300 ? 'assessment-timer-low' : ''}`} role="timer" aria-label={`${Math.floor(secondsLeft / 60)} minutes ${secondsLeft % 60} seconds remaining`}><Clock3 size={16} /><span>{formatTime(secondsLeft)}</span><small>remaining</small></div>}
    </header>

    {mode === 'intro' && <main className="assessment-intro">
      <section className="assessment-intro-card">
        <div className="assessment-intro-copy">
          <span className="assessment-kicker">A CLEAR STARTING POINT</span>
          <h2>Find out what you know—and what to focus on next.</h2>
          <p>A balanced check across reasoning, coding fundamentals, computer science, and workplace scenarios. Your result turns into a practical baseline on your dashboard.</p>
          <div className="assessment-facts"><span><Target size={16} /><strong>{ASSESSMENT_QUESTIONS.length} questions</strong></span><span><Clock3 size={16} /><strong>Up to 30 minutes</strong></span><span><ShieldCheck size={16} /><strong>Saved to your account</strong></span></div>
          <button className="primary-button assessment-start-button" type="button" onClick={startAssessment}>Start assessment <ArrowRight size={17} /></button>
        </div>
        <div className="assessment-category-list"><div className="assessment-list-top"><span className="assessment-list-heading">WHAT YOU’LL COVER</span><SectionArtwork type="assessment" className="assessment-section-art" /></div>{ASSESSMENT_CATEGORIES.map((item, index) => <article className="assessment-category-card" key={item.id}><span className={`assessment-category-number assessment-tone-${item.color}`}>0{index + 1}</span><div><strong>{item.label}</strong><p>{item.description}</p></div><span className="assessment-category-count">6 Q</span></article>)}</div>
      </section>
      {savedResult && <aside className="assessment-last-result"><div><span className="assessment-last-icon"><Trophy size={17} /></span><div><strong>Your last result: {savedResult.overallScore}%</strong><p>Retaking replaces your latest dashboard baseline.</p></div></div><button type="button" onClick={() => { setResult(savedResult); setReviewAvailable(false); setMode('results'); }}>View result <ArrowRight size={15} /></button></aside>}
      <p className="assessment-disclaimer">This is a preparation snapshot, not a hiring score. Take your time and choose the best answer for each question.</p>
    </main>}

    {mode === 'quiz' && <main className="assessment-quiz">
      <section className="assessment-quiz-heading"><div><span className={`assessment-section-tag assessment-tone-${category.color}`}>{category.label.toUpperCase()}</span><p>Question {currentIndex + 1} of {ASSESSMENT_QUESTIONS.length}<span> · </span>{categoryQuestionIndex} of {categoryQuestionCount} in this section</p></div><span className="assessment-answered-count">{answeredCount} answered</span></section>
      <div className="assessment-progress-track" role="progressbar" aria-label="Assessment progress" aria-valuemin="0" aria-valuemax={ASSESSMENT_QUESTIONS.length} aria-valuenow={currentIndex}><span style={{ width: `${currentIndex / ASSESSMENT_QUESTIONS.length * 100}%` }} /></div>
      <section className="assessment-question-card" aria-live="polite" aria-busy={transitioning}>
        <div className="assessment-question-meta"><span>{question.topic}</span><span>Choose one answer</span></div>
        <h2>{question.prompt}</h2>
        <div className="assessment-options" role="radiogroup" aria-label="Answer choices">{question.options.map((option, index) => <button className={`assessment-option ${answers[currentIndex] === index ? 'selected' : ''}`} type="button" role="radio" aria-checked={answers[currentIndex] === index} aria-disabled={transitioning} disabled={transitioning} key={option} onClick={() => selectAnswer(index)}><span className="assessment-option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{answers[currentIndex] === index && <Check size={17} />}</button>)}</div>
      </section>
      <nav className="assessment-question-nav" aria-label="Question navigation">{ASSESSMENT_QUESTIONS.map((item, index) => <button key={index} className={`${index === currentIndex ? 'current' : ''} ${answers[index] !== undefined ? 'answered' : ''} ${item.category !== question.category ? 'other-section' : ''}`} type="button" disabled={transitioning} aria-label={`Question ${index + 1}${answers[index] !== undefined ? ', answered' : ', unanswered'}${index === currentIndex ? ', current' : ''}`} aria-current={index === currentIndex ? 'step' : undefined} onClick={() => goToQuestion(index)}>{index + 1}</button>)}</nav>
      {confirmSubmit && <div className="assessment-submit-confirm" role="status"><span>{answeredCount < ASSESSMENT_QUESTIONS.length ? `${ASSESSMENT_QUESTIONS.length - answeredCount} questions are unanswered. They will count as incorrect.` : 'You’ve answered every question.'}</span><button type="button" disabled={transitioning} onClick={() => completeAssessment()}>Submit assessment</button><button className="assessment-keep-going" type="button" disabled={transitioning} onClick={() => setConfirmSubmit(false)}>Keep reviewing</button></div>}
      <footer className="assessment-controls"><button type="button" className="assessment-back-button" onClick={() => goToQuestion(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0 || transitioning}><ArrowLeft size={16} /> Previous</button><span>{answeredCount}/{ASSESSMENT_QUESTIONS.length} complete</span>{currentIndex < ASSESSMENT_QUESTIONS.length - 1 ? <button type="button" className="primary-button assessment-next-button" onClick={() => goToQuestion(currentIndex + 1)} disabled={transitioning}>Next question <ArrowRight size={16} /></button> : <button type="button" className="primary-button assessment-next-button" onClick={() => setConfirmSubmit(true)} disabled={transitioning}>Review & submit <Check size={16} /></button>}</footer>
    </main>}

    {mode === 'results' && result && <main className="assessment-results">
      <section className="assessment-result-hero"><span className="assessment-result-icon"><Trophy size={23} /></span><div><span className="assessment-kicker">YOUR STARTING POINT</span><h2>Assessment complete</h2><p>You got {result.correctAnswers} of {result.totalQuestions} questions right. Use this snapshot to decide what to practice next.</p></div><div className="assessment-overall-score"><strong>{result.overallScore}<span>%</span></strong><small>overall score</small></div></section>
      <section className="assessment-results-panel"><div className="assessment-panel-heading"><div><span className="assessment-kicker">CATEGORY BREAKDOWN</span><h3>Where you stand</h3></div><span>{formatTime(result.elapsedSeconds || 0)} taken</span></div><CategoryScores result={result} /></section>
      <section className="assessment-focus-grid"><article className="assessment-focus-card assessment-focus-strong"><span className="assessment-focus-title"><Check size={16} /> Strong topics</span>{result.strongAreas?.length ? <ul>{result.strongAreas.map((topic) => <li key={topic}>{topic}</li>)}</ul> : <p>Keep practicing to build reliable strengths across these topics.</p>}</article><article className="assessment-focus-card assessment-focus-practice"><span className="assessment-focus-title"><Target size={16} /> Good next steps</span>{result.weakAreas?.length ? <ul>{result.weakAreas.map((topic) => <li key={topic}>{topic}</li>)}</ul> : <p>No clear gaps appeared this time. Try a fresh set when you’re ready.</p>}</article></section>
      {showReview && <section className="assessment-review"><div className="assessment-panel-heading"><div><span className="assessment-kicker">ANSWER REVIEW</span><h3>Learn from every question</h3></div><button type="button" onClick={() => setShowReview(false)}>Hide review</button></div>{ASSESSMENT_QUESTIONS.map((item, index) => { const correct = answers[index] === item.answer; return <article className="assessment-review-item" key={`${item.topic}-${index}`}><span className={`assessment-review-mark ${correct ? 'is-correct' : 'is-incorrect'}`}>{correct ? <Check size={14} /> : '•'}</span><div><span className="assessment-review-label">{CATEGORY_LABEL[item.category]} · {item.topic}</span><h4>{item.prompt}</h4><p>Your answer: {answers[index] === undefined ? 'Not answered' : item.options[answers[index]]} { !correct && <strong> · Correct answer: {item.options[item.answer]}</strong>}</p><small>{item.explanation}</small></div></article>; })}</section>}
      {storageWarning && <p className="assessment-storage-warning" role="status">Your result is visible here, but browser storage prevented saving it to the dashboard.</p>}
      <footer className="assessment-result-actions">{reviewAvailable ? <button type="button" className="assessment-back-button" onClick={() => setShowReview((visible) => !visible)}>{showReview ? 'Hide answers' : 'Review answers'} <ArrowRight size={15} /></button> : <span className="assessment-panel-heading">Your score is saved to the dashboard.</span>}<button type="button" className="primary-button assessment-next-button" onClick={startAssessment}><RotateCcw size={15} /> Retake assessment</button></footer>
    </main>}
  </div>;
}
