import { getGroqError, requestGroqChat } from '../services/groqChat.js';

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 6000;
const MAX_HISTORY_LENGTH = 30000;

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return 'Add a message before sending.';
  if (messages.length > MAX_MESSAGES) return `Keep the conversation to the latest ${MAX_MESSAGES} messages.`;
  let totalLength = 0;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') return 'Each message needs a valid role and text content.';
    const content = message.content.trim();
    if (!content) return 'Messages cannot be empty.';
    if (content.length > MAX_MESSAGE_LENGTH) return 'Each message must be 6,000 characters or less.';
    if ((index === 0 && message.role !== 'user') || (index > 0 && message.role === messages[index - 1].role)) return 'Conversation messages must alternate between user and PrepBot.';
    totalLength += content.length;
  }
  if (messages[messages.length - 1].role !== 'user') return 'The latest message must be from you.';
  if (totalLength > MAX_HISTORY_LENGTH) return 'This conversation is too long. Start a new chat to continue.';
  return null;
}

function sendEvent(res, payload) {
  if (!res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function chat(req, res) {
  const { messages, stream = false, interviewMode = false, interviewFeedbackMode = false } = req.body || {};
  const validationError = validateMessages(messages);
  if (validationError) return res.status(400).json({ message: validationError });
  if (typeof stream !== 'boolean') return res.status(400).json({ message: 'The stream option must be a boolean.' });
  if (typeof interviewMode !== 'boolean') return res.status(400).json({ message: 'The interview mode option must be a boolean.' });
  if (typeof interviewFeedbackMode !== 'boolean') return res.status(400).json({ message: 'The interview feedback mode option must be a boolean.' });
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ message: 'Groq is not configured. Add GROQ_API_KEY to backend/.env and restart the API.' });

  const history = messages.slice(-MAX_MESSAGES).map(({ role, content }) => ({ role, content: content.trim() }));
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 45000);
  res.on('close', () => { if (!res.writableEnded) controller.abort(); });

  try {
    if (stream) {
      res.status(200).set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders?.();
    }
    const content = await requestGroqChat(history, {
      stream,
      interviewMode,
      interviewFeedbackMode,
      signal: controller.signal,
      onDelta: (delta) => { if (stream) sendEvent(res, { type: 'delta', delta }); },
    });
    const message = { role: 'assistant', content };
    if (stream) sendEvent(res, { type: 'done', message });
    else return res.json({ message });
    return res.end();
  } catch (error) {
    if (res.destroyed || error?.name === 'AbortError' && !timedOut) return;
    const safeError = timedOut ? { status: 504, message: 'PrepBot took too long to respond. Please try again.' } : getGroqError(error);
    console.error('Chat request failed:', error?.status || error?.code || error?.name || 'unknown error');
    if (stream && res.headersSent) {
      sendEvent(res, { type: 'error', message: safeError.message });
      return res.end();
    }
    return res.status(safeError.status).json({ message: safeError.message });
  } finally {
    clearTimeout(timeout);
  }
}
