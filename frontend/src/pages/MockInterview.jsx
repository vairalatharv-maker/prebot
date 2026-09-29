import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, CameraOff, Check, Clock3, Mic, PhoneOff, RotateCcw, Send, ShieldCheck, Sparkles, Target, Trophy, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import SectionArtwork from '../components/SectionArtwork.jsx';
import { buildInterviewQuestions, INTERVIEW_FORMATS, INTERVIEW_LEVELS, INTERVIEW_ROLES } from './interviewQuestions.js';
import '../styles/mock-interview.css';
import '../styles/ai-interview.css';
import { streamChat } from '../services/chat.js';

const ANSWER_SECONDS = 150;
const AI_INTERVIEW_SECONDS = 15 * 60;
const SESSION_KEY = (userId) => `prepbot.mockinterview.latest.${userId || 'session'}`;
const AI_HISTORY_KEY = (userId) => `prepbot.mockinterview.history.${userId || 'session'}`;

function parseInterviewTurn(content) {
  try {
    const clean = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const value = JSON.parse(clean);
    return { speech: typeof value.say === 'string' ? value.say : content, feedback: value.live_feedback && typeof value.live_feedback === 'object' ? value.live_feedback : null };
  } catch { return { speech: content, feedback: null }; }
}

function parseInterviewReport(content) {
  try {
    const clean = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const value = JSON.parse(clean);
    const score = (candidate) => Number.isFinite(Number(candidate)) ? Math.max(0, Math.min(100, Math.round(Number(candidate)))) : null;
    return {
      overall_score: score(value.overall_score),
      communication_score: score(value.communication_score),
      role_skills_score: score(value.role_skills_score),
      answer_structure_score: score(value.answer_structure_score),
      summary: typeof value.summary === 'string' ? value.summary : 'Review the notes below to plan your next practice session.',
      strengths: Array.isArray(value.strengths) ? value.strengths.filter((item) => typeof item === 'string').slice(0, 5) : [],
      gaps: Array.isArray(value.gaps) ? value.gaps.filter((item) => typeof item === 'string').slice(0, 5) : [],
      preparation_plan: Array.isArray(value.preparation_plan) ? value.preparation_plan.filter((item) => item && typeof item === 'object').slice(0, 5) : [],
    };
  } catch { return null; }
}

function parseSaved(userId) {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY(userId)) || 'null');
    return session && typeof session === 'object' && Array.isArray(session.questions) ? session : null;
  } catch { return null; }
}

function readAiHistory(userId) {
  try {
    const history = JSON.parse(localStorage.getItem(AI_HISTORY_KEY(userId)) || '[]');
    return Array.isArray(history) ? history : [];
  } catch { return []; }
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
  const { user, token } = useAuth();
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
  const [callSeconds, setCallSeconds] = useState(0);
  const [callMessages, setCallMessages] = useState([]);
  const [callDraft, setCallDraft] = useState('');
  const [callBusy, setCallBusy] = useState(false);
  const [callError, setCallError] = useState('');
  const [callNotice, setCallNotice] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [voiceInput, setVoiceInput] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [liveFeedbacks, setLiveFeedbacks] = useState([]);
  const [interviewReport, setInterviewReport] = useState(null);
  const [reportError, setReportError] = useState('');
  const [historyWarning, setHistoryWarning] = useState(false);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const callAbortRef = useRef(null);
  const callHistoryRef = useRef([]);
  const callDraftRef = useRef('');
  const callMessagesRef = useRef([]);
  const callDeadlineRef = useRef(0);
  const autoVoiceRef = useRef(false);
  const callActiveRef = useRef(false);
  const voiceTranscriptRef = useRef('');
  const startVoiceAnswerRef = useRef(null);
  const submitCallAnswerRef = useRef(null);
  const endAiInterviewRef = useRef(null);
  const [aiSessionSummary, setAiSessionSummary] = useState([]);
  const currentQuestion = questions[questionIndex];
  const currentFormat = INTERVIEW_FORMATS.find((item) => item.id === format);
  const currentLevel = INTERVIEW_LEVELS.find((item) => item.id === level);
  const currentChecks = checks[questionIndex] || [];
  const latestLiveFeedback = liveFeedbacks.at(-1) || null;
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

  const speakInterviewer = (text) => {
    if (!text) return;
    if (!('speechSynthesis' in window)) {
      setAiSpeaking(false);
      if (autoVoiceRef.current) startVoiceAnswerRef.current?.(true);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.pitch = 1.02;
    utterance.onstart = () => setAiSpeaking(true);
    utterance.onend = () => { setAiSpeaking(false); if (autoVoiceRef.current) startVoiceAnswerRef.current?.(true); };
    utterance.onerror = () => { setAiSpeaking(false); if (autoVoiceRef.current) startVoiceAnswerRef.current?.(true); };
    window.speechSynthesis.speak(utterance);
  };

  const receiveInterviewer = useCallback(async (history) => {
    const controller = new AbortController();
    callAbortRef.current = controller;
    setCallBusy(true);
    setCallError('');
    try {
      const reply = await streamChat({ messages: history, token, signal: controller.signal, interviewMode: true, onDelta: () => {} });
      const turn = parseInterviewTurn(reply.content);
      const completedHistory = [...history, reply];
      callHistoryRef.current = completedHistory;
      setCallMessages((current) => current.map((message, index) => index === current.length - 1 ? { role: 'assistant', content: turn.speech } : message));
      if (turn.feedback) setLiveFeedbacks((current) => [...current, { ...turn.feedback, answerCount: callHistoryRef.current.filter((message) => message.role === 'user').length - 1 }]);
      speakInterviewer(turn.speech);
    } catch (error) {
      if (error.name !== 'AbortError') setCallError(error.message || 'The interviewer could not respond. Try again.');
    } finally {
      if (callAbortRef.current === controller) callAbortRef.current = null;
      setCallBusy(false);
    }
  }, [token]);

  const startAiInterview = async () => {
    setCallNotice('');
    const selected = buildInterviewQuestions(level, role, format);
    let stream = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not available in this browser.');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    } catch (error) {
      setCallNotice(`Camera unavailable: ${error.message || 'permission was not granted'}. You can still continue and type your answers.`);
    }
    mediaStreamRef.current = stream;
    setCameraEnabled(Boolean(stream?.getVideoTracks().length));
    setCallSeconds(AI_INTERVIEW_SECONDS);
    callDeadlineRef.current = Date.now() + AI_INTERVIEW_SECONDS * 1000;
    setLiveFeedbacks([]);
    setInterviewReport(null);
    setReportError('');
    setHistoryWarning(false);
    setAiSpeaking(false);
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    autoVoiceRef.current = Boolean(Recognition);
    if (!Recognition) setCallNotice('For a fully voice-led interview, open this page in Chrome. You can still type your answers here.');
    setCallDraft('');
    callDraftRef.current = '';
    setCallError('');
    const topics = selected.map((question) => question.topic).join(', ');
    const kickoff = `You are interviewing a candidate for a ${role} position in a real company-style ${format} interview at ${level} level. This is a live 15-minute interview; the app enforces the hard time limit. Interview topics to cover naturally: ${topics}. Begin by greeting the candidate, briefly explain that you will ask a few role-relevant questions, then ask the first one. Ask one question at a time, wait for the candidate's spoken answer, and do not give away ideal answers or coach them during the interview. Keep each turn concise and professional, as a human interviewer would. No markdown.`;
    const history = [{ role: 'user', content: kickoff }];
    callHistoryRef.current = history;
    callActiveRef.current = true;
    setCallMessages([{ role: 'assistant', content: '' }]);
    setMode('call');
    void receiveInterviewer(history);
  };

  const submitCallAnswer = (value = callDraftRef.current) => {
    const answer = value.trim();
    if (!answer || callBusy || !callActiveRef.current) return;
    window.speechSynthesis?.cancel();
    const minutesRemaining = Math.ceil(callSeconds / 60);
    const candidateText = `Interview time remaining: about ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}. Candidate answer: ${answer}\nRespond as a professional company interviewer: briefly acknowledge the answer without evaluating or coaching, then ask the next role-relevant question. If the answer is genuinely unclear, ask one concise clarification instead. Ask only one question, keep the turn natural and under 3 sentences, and do not repeat a question already asked. When 2 minutes or less remain, wrap up naturally and invite one final question from the candidate.`;
    const history = [...callHistoryRef.current, { role: 'user', content: candidateText }];
    callHistoryRef.current = history;
    setCallMessages((current) => [...current, { role: 'user', content: answer }, { role: 'assistant', content: '' }]);
    setCallDraft('');
    callDraftRef.current = '';
    if (speechRecognitionRef.current) { speechRecognitionRef.current.stop(); speechRecognitionRef.current = null; }
    setVoiceInput(false);
    void receiveInterviewer(history);
  };

  const startVoiceAnswer = (autoSubmit = autoVoiceRef.current) => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { autoVoiceRef.current = false; setCallNotice('Voice transcription is not supported in this browser. Type your answer below instead.'); return; }
    if (voiceInput) { speechRecognitionRef.current?.stop(); speechRecognitionRef.current = null; setVoiceInput(false); autoVoiceRef.current = false; return; }
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    const startText = callDraftRef.current;
    voiceTranscriptRef.current = '';
    recognition.onresult = (event) => {
      const spoken = Array.from(event.results).map((result) => result[0].transcript).join(' ').trim();
      if (!spoken) return;
      voiceTranscriptRef.current = spoken;
      const next = `${startText}${startText && !startText.endsWith(' ') ? ' ' : ''}${spoken}`;
      callDraftRef.current = next;
      setCallDraft(next);
    };
    recognition.onerror = (event) => { setVoiceInput(false); autoVoiceRef.current = false; setCallNotice(event.error === 'not-allowed' ? 'Microphone permission was denied. You can type your answer.' : 'Voice input stopped. You can continue typing your answer.'); };
    recognition.onend = () => {
      setVoiceInput(false);
      speechRecognitionRef.current = null;
      const spoken = voiceTranscriptRef.current;
      if (autoSubmit && spoken.trim()) window.setTimeout(() => { if (callActiveRef.current) submitCallAnswerRef.current?.(`${startText}${startText && !startText.endsWith(' ') ? ' ' : ''}${spoken}`); }, 350);
      else if (autoSubmit) setCallNotice('I did not catch that. Please answer by voice again or type your response.');
    };
    speechRecognitionRef.current = recognition;
    try { recognition.start(); setVoiceInput(true); setCallNotice(autoSubmit ? 'Your interviewer is listening. Speak naturally; your answer will be sent when you finish.' : 'Listening… speak your answer, then send it when you are ready.'); }
    catch { setVoiceInput(false); autoVoiceRef.current = false; setCallNotice('Voice input could not start. Type your answer instead.'); }
  };
  startVoiceAnswerRef.current = startVoiceAnswer;
  submitCallAnswerRef.current = submitCallAnswer;

  const toggleCamera = () => {
    const track = mediaStreamRef.current?.getVideoTracks()[0];
    if (!track) { setCallNotice('Camera is unavailable. You can continue the interview without video.'); return; }
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  };

  const evaluateAiInterview = useCallback(async (summary) => {
    setMode('ai-evaluating');
    const transcript = summary.slice(-24).map((message) => `${message.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${message.content}`).join('\n');
    const transcriptPrompt = `Assess this completed ${format} mock interview for a ${level} ${role} role. Use only the candidate's answers. Transcript:\n${transcript.slice(-5600)}`;
    let report = null;
    try {
      const reply = await streamChat({ messages: [{ role: 'user', content: transcriptPrompt }], token, interviewFeedbackMode: true, onDelta: () => {} });
      report = parseInterviewReport(reply.content);
      if (!report) throw new Error('The AI feedback report could not be read.');
    } catch (error) {
      const scores = liveFeedbacks.map((item) => Number(item.score)).filter((score) => Number.isFinite(score));
      const gaps = [...new Set(liveFeedbacks.map((item) => item.improve).filter((item) => typeof item === 'string' && item.trim()))].slice(0, 5);
      report = {
        overall_score: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
        communication_score: null,
        role_skills_score: null,
        answer_structure_score: null,
        summary: 'The full report could not be generated. Your live interviewer feedback is included below.',
        strengths: [...new Set(liveFeedbacks.map((item) => item.strength).filter(Boolean))].slice(0, 5),
        gaps,
        preparation_plan: liveFeedbacks.filter((item) => item.practice).slice(-4).map((item) => ({ focus: item.improve || 'Interview practice', why: item.strength || 'From your live interview answers', practice: item.practice, time: '15 minutes' })),
      };
      setReportError(error.message || 'The full AI report was unavailable. Showing live interview feedback instead.');
    }
    const record = {
      completedAt: new Date().toISOString(),
      role,
      level,
      format,
      durationSeconds: Math.max(0, AI_INTERVIEW_SECONDS - callSeconds),
      answers: summary.filter((message) => message.role === 'user').length,
      report,
      liveFeedbacks,
      transcript: summary,
    };
    try {
      const history = [record, ...readAiHistory(userId)].slice(0, 20);
      localStorage.setItem(AI_HISTORY_KEY(userId), JSON.stringify(history));
      localStorage.setItem(SESSION_KEY(userId), JSON.stringify({ ...record, aiInterview: true }));
    } catch { setHistoryWarning(true); }
    setInterviewReport(report);
    setMode('ai-results');
  }, [token, userId, role, level, format, liveFeedbacks, callSeconds]);

  const endAiInterview = () => {
    callActiveRef.current = false;
    callAbortRef.current?.abort();
    callAbortRef.current = null;
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    window.speechSynthesis?.cancel();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setCameraEnabled(false);
    setVoiceInput(false);
    setAiSpeaking(false);
    const summary = callMessagesRef.current.filter((message) => message.content);
    setAiSessionSummary(summary);
    setCallMessages([]);
    void evaluateAiInterview(summary);
  };
  endAiInterviewRef.current = endAiInterview;

  useEffect(() => { callMessagesRef.current = callMessages; }, [callMessages]);

  useEffect(() => {
    if (mode !== 'call') return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((callDeadlineRef.current - Date.now()) / 1000));
      setCallSeconds(remaining);
      if (remaining === 0) {
        window.clearInterval(timer);
        endAiInterviewRef.current?.();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (mode === 'call' && videoRef.current && mediaStreamRef.current) videoRef.current.srcObject = mediaStreamRef.current;
  }, [mode, cameraEnabled]);

  useEffect(() => () => {
    callAbortRef.current?.abort();
    speechRecognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

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
      <section className="interview-setup-hero"><div><span className="interview-kicker">PRACTICE WITH PURPOSE</span><h2>Get comfortable with the questions that move you forward.</h2><p>Choose your role and difficulty, then take a timed 15-minute interview with an AI interviewer.</p></div><SectionArtwork type="interview" className="interview-section-art" /></section>
      <section className="interview-setup-grid">
        <div className="interview-setup-panel">
          <div className="interview-panel-heading"><span className="interview-panel-icon"><Target size={17} /></span><div><h3>Build your practice round</h3><p>Make it feel closer to the role you want.</p></div></div>
          <label className="interview-field-label" htmlFor="interview-role">Role focus</label>
          <select id="interview-role" className="interview-select" value={role} onChange={(event) => setRole(event.target.value)}>{INTERVIEW_ROLES.map((item) => <option key={item}>{item}</option>)}</select>
          <span className="interview-field-label">Interview format</span>
          <div className="interview-format-options">{INTERVIEW_FORMATS.map((item) => <button type="button" key={item.id} className={`interview-format-option ${format === item.id ? 'selected' : ''}`} onClick={() => setFormat(item.id)} aria-pressed={format === item.id}><span className="interview-radio-dot" /><span><strong>{item.label}</strong><small>{item.detail}</small></span></button>)}</div>
          <span className="interview-field-label">Difficulty</span>
          <div className="interview-level-options">{INTERVIEW_LEVELS.map((item) => <button type="button" key={item.id} className={`interview-level-option ${level === item.id ? 'selected' : ''}`} onClick={() => setLevel(item.id)} aria-pressed={level === item.id}><strong>{item.label}</strong><small>{item.detail}</small></button>)}</div>
          <div className="interview-session-note"><Clock3 size={15} /><span><strong>15 minutes maximum</strong> · AI interviewer leads the conversation</span></div>
          <button type="button" className="primary-button interview-start-button" onClick={startAiInterview}>Start 15-minute interview <ArrowRight size={17} /></button>
          <button type="button" className="ai-quick-practice" onClick={beginSession}>Use text-only practice instead</button>
        </div>
        <aside className="interview-side-panel"><span className="interview-kicker">YOUR AI INTERVIEW</span><h3>A focused 15-minute interview.</h3><ol><li><span>1</span><div><strong>Meet your interviewer</strong><p>PrepBot speaks each role-focused question and follows up on your answers.</p></div></li><li><span>2</span><div><strong>Answer naturally</strong><p>Allow microphone access for automatic voice answers, or type whenever you prefer.</p></div></li><li><span>3</span><div><strong>Review your conversation</strong><p>The interview ends at 15 minutes. Your transcript is ready to review afterward.</p></div></li></ol><div className="interview-honesty-note"><Sparkles size={15} /><p>Your camera preview stays in your browser. Only answer text or speech transcription is sent to PrepBot; the call is not recorded.</p></div></aside>
      </section>
      {savedSession && <button type="button" className="interview-previous-session" onClick={() => { setSession(savedSession); setMode('results'); }}><span className="interview-previous-icon"><Trophy size={17} /></span><span><strong>View your last practice round</strong><small>{savedSession.answered} answers saved{dateLabel ? ` · ${dateLabel}` : ''}</small></span><ArrowRight size={16} /></button>}
    </main>}

    {mode === 'call' && <main className="ai-call-page">
      <header className="ai-call-header"><div className="ai-call-identity"><span className="ai-call-mark"><Sparkles size={18} /></span><div><strong>PrepBot Interviewer</strong><span>{role} · {currentLevel.label} round</span></div><span className="ai-call-live"><i /> LIVE</span></div><div className="ai-call-header-right"><span title="This interview ends automatically after 15 minutes"><Clock3 size={14} /> {formatClock(callSeconds)} left</span><button type="button" className="ai-end-call ai-end-call-top" onClick={endAiInterview}><PhoneOff size={14} /> End call</button></div></header>
      <div className="ai-call-layout">
        <section className="ai-call-stage" aria-label="Video interview">
          <div className="ai-stage-glow" />
          <div className={`ai-interviewer-avatar ${callBusy ? 'is-speaking' : ''}`} aria-label="AI interviewer avatar"><div className="ai-avatar-halo"/><div className="ai-avatar-head"><span className="ai-avatar-hair"/><span className="ai-avatar-eye eye-left"/><span className="ai-avatar-eye eye-right"/><span className="ai-avatar-nose"/><span className="ai-avatar-smile"/></div><div className="ai-avatar-shoulders"/><div className="ai-avatar-spark"><Sparkles size={17}/></div></div>
          <div className="ai-interviewer-label"><strong>PrepBot</strong><span>{aiSpeaking ? 'Speaking…' : voiceInput ? 'Listening…' : callBusy ? 'Thinking…' : 'AI interviewer'}</span>{aiSpeaking && <Volume2 size={14}/>}</div>
          <div className="ai-self-video">{cameraEnabled && mediaStreamRef.current ? <video ref={videoRef} autoPlay muted playsInline aria-label="Your camera preview" /> : <div className="ai-camera-off"><CameraOff size={22}/><span>Camera off</span></div>}<span className="ai-self-video-label">You</span></div>
          <div className="ai-call-controls"><div className={`ai-voice-status ${voiceInput ? 'is-listening' : aiSpeaking ? 'is-speaking' : ''}`}><Mic size={17}/><span>{voiceInput ? 'Listening automatically — speak naturally' : aiSpeaking ? 'PrepBot is speaking' : callBusy ? 'Preparing your next question' : 'Voice interview · no button needed'}</span></div><button type="button" className={`ai-control ${cameraEnabled ? '' : 'is-muted'}`} onClick={toggleCamera} aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'} title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}>{cameraEnabled ? <Camera size={18}/> : <CameraOff size={18}/>}<span>{cameraEnabled ? 'Camera on' : 'Camera off'}</span></button><button type="button" className="ai-end-call" onClick={endAiInterview}><PhoneOff size={17}/><span>End call</span></button></div>
          <p className="ai-call-privacy">Camera preview is local and is not recorded or sent.</p>
        </section>
        <aside className="ai-call-transcript">
          <div className="ai-transcript-heading"><div><span className="interview-kicker">LIVE TRANSCRIPT</span><h2>Interview conversation</h2></div><span className="ai-transcript-count">{callMessages.filter((message) => message.role === 'user').length} answers</span></div>
          <section className="ai-live-feedback" aria-live="polite"><div className="ai-live-feedback-title"><span className="interview-kicker">LIVE INTERVIEW FEEDBACK</span>{latestLiveFeedback?.score !== undefined && <strong>{latestLiveFeedback.score}/100</strong>}</div>{latestLiveFeedback ? <><p><b>Working well:</b> {latestLiveFeedback.strength || 'Keep explaining your thinking clearly.'}</p><p><b>Improve:</b> {latestLiveFeedback.improve || 'Your answer covered the main point. Add a specific example when useful.'}</p><small><Target size={12}/> Try next: {latestLiveFeedback.practice || 'Support your answer with a concrete example.'}</small></> : <p>Your interviewer will share a quick strength and one improvement after your first answer.</p>}</section>
          <div className="ai-transcript-list" aria-live="polite">{callMessages.map((message, index) => <article className={`ai-transcript-message ${message.role === 'user' ? 'candidate-message' : 'interviewer-message'}`} key={`${message.role}-${index}`}><span>{message.role === 'user' ? 'YOU' : 'PREPBOT'}</span><p>{message.content || (callBusy && index === callMessages.length - 1 ? 'Preparing the next question…' : '')}</p></article>)}{!callMessages.length && <p className="ai-transcript-empty">Your interview conversation will appear here.</p>}</div>
          {callError && <div className="ai-call-error" role="alert"><span>{callError}</span><button type="button" onClick={() => { const history = callHistoryRef.current; if (history.at(-1)?.role === 'user') void receiveInterviewer(history); }}>Retry</button></div>}
          {callNotice && <p className="ai-call-notice" role="status">{callNotice}</p>}
          <form className="ai-answer-composer" onSubmit={(event) => { event.preventDefault(); submitCallAnswer(); }}><textarea rows="2" maxLength="4000" value={callDraft} onChange={(event) => { callDraftRef.current = event.target.value; setCallDraft(event.target.value); }} placeholder={voiceInput ? 'Listening… your words will appear here' : 'Type your answer or use voice input…'} aria-label="Your interview answer" disabled={callBusy}/><button type="submit" disabled={callBusy || !callDraft.trim()} aria-label="Send answer"><Send size={17}/></button></form>
          <p className="ai-answer-note">Your answer text is sent to PrepBot AI to create relevant follow-up questions.</p>
        </aside>
      </div>
    </main>}

    {mode === 'ai-evaluating' && <main className="ai-evaluation-loading"><span className="ai-evaluation-loader"><Sparkles size={24}/></span><span className="interview-kicker">INTERVIEW FINISHED</span><h2>Reviewing your answers…</h2><p>PrepBot is finding your strengths, improvement areas, and the best next steps for your preparation.</p></main>}

    {mode === 'ai-results' && <main className="interview-results"><section className="interview-result-hero"><span className="interview-result-trophy"><Check size={22}/></span><div><span className="interview-kicker">VIDEO INTERVIEW COMPLETE</span><h2>Your interview growth report</h2><p>{interviewReport?.summary || 'Review the feedback and use your next practice session to strengthen one area at a time.'}</p></div><div className="interview-result-count"><strong>{interviewReport?.overall_score ?? '—'}<span>{interviewReport?.overall_score === null ? '' : '/100'}</span></strong><small>practice score</small></div></section>
      {reportError && <p className="interview-storage-warning" role="status">{reportError}</p>}
      <section className="ai-report-score-grid">{[['Overall interview', interviewReport?.overall_score], ['Communication', interviewReport?.communication_score], ['Role knowledge', interviewReport?.role_skills_score], ['Answer structure', interviewReport?.answer_structure_score]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value ?? '—'}{value === null || value === undefined ? '' : '%'}</strong><div><i style={{ width: `${value ?? 0}%` }}/></div></article>)}</section>
      <section className="ai-report-insights"><article className="ai-report-panel"><span className="interview-kicker">WHAT YOU DID WELL</span><h3>Strengths to keep</h3>{interviewReport?.strengths?.length ? <ul>{interviewReport.strengths.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>Complete more interview answers to identify recurring strengths.</p>}</article><article className="ai-report-panel ai-report-gaps"><span className="interview-kicker">AREAS TO IMPROVE</span><h3>Where to focus next</h3>{interviewReport?.gaps?.length ? <ul>{interviewReport.gaps.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>No clear gap was identified from this short practice session. Keep building consistency.</p>}</article></section>
      <section className="ai-report-panel ai-preparation-plan"><div><span className="interview-kicker">YOUR PREPARATION PLAN</span><h3>Concrete next steps</h3></div>{interviewReport?.preparation_plan?.length ? interviewReport.preparation_plan.map((item, index) => <article key={`${item.focus}-${index}`}><span className="ai-plan-number">{String(index + 1).padStart(2, '0')}</span><div><h4>{item.focus || 'Focused practice'}</h4><p>{item.why}</p><strong>{item.practice}</strong></div><small>{item.time}</small></article>) : <p>Practice a few more questions to build a detailed preparation plan.</p>}</section>
      <section className="interview-answer-summary ai-results-transcript"><div className="interview-summary-heading"><span className="interview-kicker">INTERVIEW TRANSCRIPT</span><button type="button" onClick={startAiInterview}><RotateCcw size={13}/> New AI interview</button></div>{aiSessionSummary.map((message, index) => <article className="interview-summary-item" key={`${message.role}-${index}`}><span className="interview-summary-number">{message.role === 'user' ? 'YOU' : 'AI'}</span><div><span>{message.role === 'user' ? 'Your answer' : 'PrepBot interviewer'}</span><p>{message.content}</p></div></article>)}</section>
      {historyWarning && <p className="interview-storage-warning" role="status">Your report is visible now, but browser storage could not save it to dashboard history.</p>}
      <footer className="interview-result-actions"><p><ShieldCheck size={15}/> Scores are practice estimates based on your spoken answer transcripts; no video is recorded.</p><button type="button" className="primary-button interview-start-button" onClick={() => setMode('setup')}>Back to interview setup <ArrowRight size={15}/></button></footer></main>}

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
