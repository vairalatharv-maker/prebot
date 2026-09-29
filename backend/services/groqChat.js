import { MOCK_INTERVIEW_FEEDBACK_INSTRUCTIONS, MOCK_INTERVIEW_INSTRUCTIONS, PREPBOT_INSTRUCTIONS } from './chatInstructions.js';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_CHAT_URL = `${GROQ_BASE_URL}/chat/completions`;
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';
const FALLBACK_GROQ_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];

function safeUpstreamError(status, { retryAfterSeconds } = {}) {
  const error = new Error('Groq request failed.');
  error.status = status;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    error.retryAfterSeconds = Math.ceil(retryAfterSeconds);
  }
  return error;
}

function readEvent(block) {
  const payload = block.split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');
  if (!payload || payload === '[DONE]') return null;
  try { return JSON.parse(payload); } catch { return null; }
}

async function requestGroqChatWithModel(messages, model, { stream, signal, onDelta, interviewMode, interviewFeedbackMode }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const error = new Error('Groq is not configured. Add GROQ_API_KEY to backend/.env and restart the API.');
    error.code = 'MISSING_API_KEY';
    throw error;
  }

  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: stream ? 'text/event-stream' : 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: interviewFeedbackMode ? MOCK_INTERVIEW_FEEDBACK_INSTRUCTIONS : interviewMode ? MOCK_INTERVIEW_INSTRUCTIONS : PREPBOT_INSTRUCTIONS },
        ...messages,
      ],
      stream,
      max_tokens: 1400,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    throw safeUpstreamError(response.status, { retryAfterSeconds });
  }
  if (!stream) {
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const text = typeof content === 'string' ? content.trim() : '';
    if (!text) throw safeUpstreamError(502);
    return text;
  }

  if (!response.body) throw safeUpstreamError(502);
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  const processBlock = (block) => {
    const event = readEvent(block);
    if (!event) return;
    const deltaContent = event?.choices?.[0]?.delta?.content;
    if (typeof deltaContent === 'string' && deltaContent.length > 0) {
      content += deltaContent;
      onDelta(deltaContent);
    }
    if (event?.error) throw safeUpstreamError(502);
  };

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');
    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      processBlock(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) processBlock(buffer);
  if (!content.trim()) throw safeUpstreamError(502);
  return content.trim();
}

export async function requestGroqChat(messages, { stream, signal, onDelta, interviewMode = false, interviewFeedbackMode = false }) {
  const candidateModels = [process.env.GROQ_MODEL, DEFAULT_GROQ_MODEL, ...FALLBACK_GROQ_MODELS].filter(Boolean);
  const uniqueModels = [...new Set(candidateModels)];

  let lastError = null;
  for (const model of uniqueModels) {
    try {
      return await requestGroqChatWithModel(messages, model, { stream, signal, onDelta, interviewMode, interviewFeedbackMode });
    } catch (error) {
      lastError = error;
      // A model-specific 429 should not prevent trying the supported fallback
      // models. If Groq is rate-limiting the whole account, the final error is
      // returned with its Retry-After duration.
      if (![400, 404, 429].includes(error?.status)) throw error;
    }
  }

  throw lastError || safeUpstreamError(502);
}

export function getGroqError(error) {
  if (error?.code === 'MISSING_API_KEY') return { status: 503, message: error.message };
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return { status: 504, message: 'PrepBot took too long to respond. Please try again.' };
  if (error?.status === 429) {
    const wait = error.retryAfterSeconds;
    const message = wait
      ? `Groq is temporarily rate-limiting requests. Please try again in about ${wait} seconds.`
      : 'Groq is temporarily rate-limiting requests. Please wait a moment and try again.';
    return { status: 429, message };
  }
  if (error?.status === 401 || error?.status === 403) return { status: 503, message: 'The Groq API credentials are not accepted. Check GROQ_API_KEY in backend/.env.' };
  if (error?.status && error.status >= 500) return { status: 502, message: 'The AI service is temporarily unavailable. Please try again.' };
  return { status: 502, message: 'PrepBot could not complete that response. Please try again.' };
}
