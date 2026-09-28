import { Children, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ArrowDown, ArrowRight, Bot, Check, Copy, Ellipsis, FileText, GitBranchPlus, Mic, MicOff, Plus, RefreshCcw, Send, Share2, Sparkles, Square, ThumbsDown, ThumbsUp, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import SectionArtwork from '../components/SectionArtwork.jsx';
import { streamChat } from '../services/chat.js';
import '../styles/chat.css';
import '../styles/chat-error.css';
import 'highlight.js/styles/github-dark.css';

const SUGGESTIONS = [
  { icon: '01', text: 'Explain DBMS normalization' },
  { icon: '02', text: 'Give me 5 DSA interview questions' },
  { icon: '03', text: 'Help me prepare for an HR interview' },
  { icon: '04', text: 'Explain SQL joins with examples' },
];

function storageKey(userId) { return `prepbot.chat.${userId || 'session'}`; }
function loadConversation(userId) {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(userId)) || '[]');
    return Array.isArray(value) ? value.filter((item) => ['user', 'assistant'].includes(item?.role) && typeof item.content === 'string').slice(-80) : [];
  } catch { return []; }
}
function plainText(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(plainText).join('');
  if (isValidElement(node)) return plainText(node.props.children);
  return '';
}

function CodeBlock({ children }) {
  const child = Children.toArray(children).find((item) => isValidElement(item) && item.type === 'code');
  const code = plainText(child?.props.children).replace(/\n$/, '');
  const languageClass = child?.props.className || '';
  const language = languageClass.match(/language-([\w+#.-]+)/)?.[1] || 'code';
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return <div className="chat-code-block">
    <div className="chat-code-toolbar"><span>{language}</span><button type="button" onClick={copyCode} aria-label="Copy code">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div>
    <pre><code className={languageClass}>{child?.props.children}</code></pre>
  </div>;
}

function AssistantMarkdown({ content }) {
  return <div className="chat-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ pre: CodeBlock }}>{content}</ReactMarkdown></div>;
}

function AssistantActions({ message, onCopy, onShare, onRegenerate }) {
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0, placement: 'bottom' });
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const updatePosition = () => {
      const anchorRect = menuButtonRef.current?.getBoundingClientRect();
      if (!anchorRect) return;

      const width = 220;
      const height = 152;
      const gap = 10;
      const spaceAbove = anchorRect.top;
      const spaceBelow = window.innerHeight - anchorRect.bottom;
      const nextPlacement = spaceAbove >= height + gap ? 'top' : 'bottom';

      let left = anchorRect.left + (anchorRect.width / 2) - (width / 2);
      let top = nextPlacement === 'top' ? anchorRect.top - height - gap : anchorRect.bottom + gap;

      left = Math.min(Math.max(12, left), window.innerWidth - width - 12);
      top = nextPlacement === 'top' ? Math.max(12, top) : Math.min(window.innerHeight - height - 12, top);
      setMenuPosition({ left, top, placement: nextPlacement });
    };

    updatePosition();
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();
    const handlePointerDown = (event) => {
      const pathTarget = event.target;
      if (!menuRef.current?.contains(pathTarget) && !menuButtonRef.current?.contains(pathTarget)) setMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const menuItems = [
    { label: 'View sources', icon: <FileText size={13} />, action: () => setMenuOpen(false) },
    { label: 'Branch in new chat', icon: <GitBranchPlus size={13} />, action: () => setMenuOpen(false) },
    { label: 'Read aloud', icon: <Volume2 size={13} />, action: () => setMenuOpen(false) },
  ];

  return (
    <div className="chat-message-actions" aria-label="AI response actions">
      <button type="button" className="chat-action-button" aria-label="Copy AI response" title="Copy" onClick={onCopy}>
        <Copy size={13} />
      </button>
      <button type="button" className={`chat-action-button ${liked ? 'chat-action-button-active' : ''}`} aria-label="Like AI response" title="Like" onClick={() => setLiked((value) => !value)}>
        <ThumbsUp size={13} />
      </button>
      <button type="button" className={`chat-action-button ${disliked ? 'chat-action-button-active' : ''}`} aria-label="Dislike AI response" title="Dislike" onClick={() => setDisliked((value) => !value)}>
        <ThumbsDown size={13} />
      </button>
      <button type="button" className="chat-action-button" aria-label="Share AI response" title="Share" onClick={onShare}>
        <Share2 size={13} />
      </button>
      <button type="button" className="chat-action-button" aria-label="Regenerate AI response" title="Regenerate" onClick={onRegenerate}>
        <RefreshCcw size={13} />
      </button>
      <button ref={menuButtonRef} type="button" className="chat-action-button chat-action-button-more" aria-label="More AI actions" title="More" onClick={() => setMenuOpen((value) => !value)}>
        <Ellipsis size={14} />
      </button>
      {menuOpen && (
        <div ref={menuRef} className={`chat-more-menu chat-more-menu-${menuPosition.placement}`} style={{ left: menuPosition.left, top: menuPosition.top }} role="menu" aria-label="More AI actions">
          {menuItems.map(({ label, icon, action }) => (
            <button key={label} type="button" className="chat-more-menu-item" role="menuitem" onClick={() => { action(); }}>
              <span className="chat-more-menu-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Message({ message, onCopy, onShare, onRegenerate }) {
  if (message.role === 'user') return <div className="chat-message chat-message-user"><div className="chat-user-bubble">{message.content}</div></div>;

  return <div className="chat-message chat-message-assistant">
    <div className="chat-assistant-mark"><Bot size={16} /></div>
    <div className="chat-assistant-content-wrap">
      <div className="chat-assistant-content">{message.content ? <AssistantMarkdown content={message.content} /> : null}</div>
      {message.content ? <AssistantActions message={message} onCopy={onCopy} onShare={onShare} onRegenerate={onRegenerate} /> : null}
    </div>
  </div>;
}

function TypingIndicator() {
  return <div className="chat-typing-row"><div className="chat-assistant-mark"><Bot size={16} /></div><div className="chat-typing"><span>PrepBot is thinking</span><i /><i /><i /></div></div>;
}

export default function Chat() {
  const { token, user } = useAuth();
  const userId = user?.id || user?._id;
  const [messages, setMessages] = useState(() => loadConversation(userId));
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [retryText, setRetryText] = useState('');
  const [notice, setNotice] = useState('');
  const inputRef = useRef(null);
  const messagesRef = useRef(null);
  const activeRequestRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceBaseRef = useRef('');
  const voiceFinalRef = useRef('');
  const conversationKey = useMemo(() => storageKey(userId), [userId]);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    try { sessionStorage.setItem(conversationKey, JSON.stringify(messages.slice(-80))); } catch { /* Private browsing can disable session storage. */ }
  }, [conversationKey, messages]);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => () => {
    activeRequestRef.current?.controller.abort();
    recognitionRef.current?.stop?.();
  }, []);

  const focusInput = useCallback(() => window.setTimeout(() => inputRef.current?.focus(), 0), []);

  const startNewChat = () => {
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    recognitionRef.current?.stop?.();
    setBusy(false);
    setListening(false);
    setMessages([]);
    setDraft('');
    setError('');
    setRetryText('');
    setNotice('');
    focusInput();
  };

  const lastUserMessage = useMemo(() => [...messages].reverse().find((message) => message.role === 'user'), [messages]);

  const handleCopyAi = async (content) => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Ignore clipboard errors and keep the rest of the UI unchanged.
    }
  };

  const handleShareAi = async (content) => {
    if (!content) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PrepBot reply', text: content });
        return;
      } catch {
        // Fall through to clipboard copy as a safe default.
      }
    }
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Ignore share/copy errors gracefully.
    }
  };

  const sendMessage = useCallback(async (selectedText) => {
    const content = (selectedText ?? draft).trim();
    if (!content || busy) return;
    if (content.length > 6000) { setError('Keep each message under 6,000 characters.'); return; }
    if (!token) { setError('Your session has expired. Sign in again to continue.'); return; }

    recognitionRef.current?.stop?.();
    setListening(false);
    setDraft('');
    setError('');
    setRetryText('');
    setNotice('');
    const userMessage = { role: 'user', content, id: `user-${Date.now()}` };
    const assistantId = `assistant-${Date.now()}`;
    const requestMessages = [...messages, userMessage].map(({ role, content: text }) => ({ role, content: text }));
    setMessages((current) => [...current, userMessage, { role: 'assistant', content: '', id: assistantId }]);
    const controller = new AbortController();
    const requestId = assistantId;
    activeRequestRef.current = { id: requestId, controller };
    setBusy(true);

    try {
      await streamChat({
        messages: requestMessages,
        token,
        signal: controller.signal,
        onDelta: (delta) => setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: message.content + delta } : message)),
      });
    } catch (sendError) {
      if (controller.signal.aborted) return;
      setMessages((current) => current.filter((message) => message.id !== assistantId || message.content));
      setError(sendError.message || 'Could not reach PrepBot. Please try again.');
      setRetryText(content);
    } finally {
      if (activeRequestRef.current?.id === requestId) {
        activeRequestRef.current = null;
        setBusy(false);
      }
    }
  }, [busy, draft, messages, token]);

  const toggleMicrophone = () => {
    if (listening) { recognitionRef.current?.stop?.(); setListening(false); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setNotice('Voice input is not supported in this browser. Try Chrome or Edge.'); return; }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      voiceBaseRef.current = draft.trim();
      voiceFinalRef.current = '';
      recognition.onresult = (event) => {
        let interim = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const text = event.results[index][0]?.transcript || '';
          if (event.results[index].isFinal) voiceFinalRef.current += text;
          else interim += text;
        }
        const spoken = `${voiceFinalRef.current}${interim}`.trim();
        const base = voiceBaseRef.current;
        setDraft(spoken ? `${base}${base ? ' ' : ''}${spoken}` : base);
      };
      recognition.onerror = (event) => {
        const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone access was denied. Allow it in your browser settings to use voice input.'
          : event.error === 'audio-capture' ? 'No microphone was found. Check your device and try again.'
            : event.error === 'network' ? 'Voice recognition could not connect. Check your internet connection.'
              : event.error === 'no-speech' ? 'No speech was detected. Try speaking a little closer to your microphone.'
                : 'Voice input stopped. You can edit the text and send it when ready.';
        setNotice(message);
        setListening(false);
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      recognition.start();
      setNotice('');
      setListening(true);
      focusInput();
    } catch {
      setListening(false);
      setNotice('Could not start voice input. Check microphone access and try again.');
    }
  };

  const handleInput = (event) => {
    setDraft(event.target.value);
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`;
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return <main className="chat-page">
    <header className="chat-header">
      <div className="chat-brand"><span className="chat-brand-mark"><Sparkles size={18} /></span><div><strong>PrepBot</strong><span>AI Placement Coach</span></div><span className="chat-online"><i /> Online</span></div>
      <button className="chat-new-button" type="button" onClick={startNewChat}><Plus size={15} /> New chat</button>
    </header>

    <section className={`chat-transcript ${hasMessages ? 'chat-transcript-active' : ''}`} ref={messagesRef} aria-label="Conversation" aria-live="polite">
      {!hasMessages ? <div className="chat-empty-state">
        <SectionArtwork type="chat" className="chat-section-art" />
        <h1>How can I help you today?</h1>
        <p>Ask me anything about coding, DSA, DBMS, SQL, interviews or placement preparation.</p>
        <div className="chat-suggestions">{SUGGESTIONS.map((suggestion) => <button key={suggestion.text} type="button" disabled={busy} onClick={() => void sendMessage(suggestion.text)}><span>{suggestion.icon}</span><strong>{suggestion.text}</strong><ArrowRight size={15} /></button>)}</div>
      </div> : <div className="chat-message-list">{messages.filter((message) => !(busy && message.role === 'assistant' && !message.content)).map((message) => message.role === 'assistant' ? <Message key={message.id || `${message.role}-${message.content.slice(0, 20)}`} message={message} onCopy={() => void handleCopyAi(message.content)} onShare={() => void handleShareAi(message.content)} onRegenerate={() => { if (lastUserMessage?.content) void sendMessage(lastUserMessage.content); }} /> : <Message key={message.id || `${message.role}-${message.content.slice(0, 20)}`} message={message} />)}{busy && <TypingIndicator />}</div>}
      {error && <div className="chat-error" role="alert"><span>{error}</span>{retryText && <button type="button" onClick={() => void sendMessage(retryText)}>Retry</button>}</div>}
    </section>

    <footer className="chat-compose-area">
      {notice && <div className="chat-notice" role="status">{notice}</div>}
      <div className="chat-composer">
        <textarea ref={inputRef} rows="1" maxLength="6000" value={draft} onChange={handleInput} onKeyDown={handleKeyDown} placeholder={listening ? 'Listening… speak and review the text before sending' : 'Message PrepBot…'} aria-label="Message PrepBot" disabled={busy} />
        <div className="chat-composer-tools">
          <span className={`chat-char-count ${draft.length > 5400 ? 'chat-char-count-warn' : ''}`}>{draft.length > 5200 ? `${draft.length}/6000` : ''}</span>
          <button className={`chat-mic-button ${listening ? 'chat-mic-active' : ''}`} type="button" aria-label={listening ? 'Stop listening' : 'Use voice input'} title={listening ? 'Stop listening' : 'Use voice input'} onClick={toggleMicrophone} disabled={busy}>{listening ? <MicOff size={18} /> : <Mic size={18} />}</button>
          {busy ? <button className="chat-send-button chat-stop-button" type="button" aria-label="Stop response" title="Stop response" onClick={() => {
            const active = activeRequestRef.current;
            active?.controller.abort();
            activeRequestRef.current = null;
            setBusy(false);
            if (active) setMessages((current) => current.filter((message) => message.id !== active.id || message.content));
          }}><Square size={13} fill="currentColor" /></button> : <button className="chat-send-button" type="button" aria-label="Send message" title="Send message" onClick={() => void sendMessage()} disabled={!draft.trim()}><Send size={17} /></button>}
        </div>
      </div>
      <div className="chat-compose-note">PrepBot can make mistakes. Check important information before relying on it.</div>
    </footer>
    <button className="chat-scroll-latest" type="button" aria-label="Scroll to latest message" onClick={() => messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })}><ArrowDown size={15} /></button>
  </main>;
}
