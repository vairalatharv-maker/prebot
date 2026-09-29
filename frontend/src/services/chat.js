const API_URL = import.meta.env.VITE_API_URL || '/api';

function compactHistory(messages) {
  let history = messages.slice(-20).map(({ role, content }) => ({ role, content }));
  if (history[0]?.role === 'assistant') history = history.slice(1);
  const lengthOf = () => history.reduce((sum, message) => sum + message.content.length, 0);
  while (history.length > 1 && lengthOf() > 30000) history = history.slice(history[0].role === 'user' ? 2 : 1);
  return history;
}

function parseSseBlock(block) {
  const data = block.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
  if (!data || data === '[DONE]') return null;
  try { return JSON.parse(data); } catch { return null; }
}

export async function streamChat({ messages, token, signal, onDelta, interviewMode = false }) {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'text/event-stream, application/json' },
    body: JSON.stringify({ messages: compactHistory(messages), stream: true, interviewMode }),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'PrepBot could not answer just now. Please try again.');
  }
  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (!data.message || typeof data.message.content !== 'string') throw new Error('PrepBot returned an invalid response. Please try again.');
    onDelta(data.message.content);
    return data.message;
  }
  if (!response.body) throw new Error('Streaming is not available in this browser. Please try again.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completeMessage = null;
  const handleBlock = (block) => {
    const event = parseSseBlock(block);
    if (!event) return;
    if (event.type === 'delta' && typeof event.delta === 'string') onDelta(event.delta);
    else if (event.type === 'done' && event.message?.role === 'assistant') completeMessage = event.message;
    else if (event.type === 'error') throw new Error(event.message || 'PrepBot could not finish the response.');
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        handleBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
  if (completeMessage) return completeMessage;
  throw new Error('PrepBot response ended before it was complete. Please try again.');
}
