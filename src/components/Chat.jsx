import { useEffect, useMemo, useRef, useState } from 'react';

function getMessageDate(timestamp) {
  const value = Number(timestamp);
  return Number.isFinite(value)
    ? new Date(value > 1_000_000_000_000 ? value : value * 1000)
    : new Date();
}

function formatTime(timestamp) {
  return getMessageDate(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getUserName(id) {
  return id ? String(id).slice(0, 8) : 'guest';
}

export default function Chat({ messages = [], sendMessage, userId }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const visibleMessages = useMemo(() => {
    const seen = new Set();

    // Keep sequence-less optimistic/local messages visible while dropping repeats.
    return messages.filter((message) => {
      const sequenceId = message.sequence_id ?? message.sequenceId;

      if (sequenceId === undefined || sequenceId === null) {
        return true;
      }

      if (seen.has(sequenceId)) {
        return false;
      }

      seen.add(sequenceId);
      return true;
    });
  }, [messages]);

  useEffect(() => {
    // New messages should land in view without changing the outer page scroll.
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [visibleMessages.length]);

  function handleSubmit(event) {
    event.preventDefault();

    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }

    sendMessage?.({ type: 'chat', text: trimmedText });
    setText('');
  }

  return (
    <section className="chat" aria-label="Room chat">
      <div className="chat__messages" role="log" aria-live="polite">
        {visibleMessages.map((message, index) => {
          const messageUserId = message.user_id ?? message.userId;
          const isOwn = messageUserId === userId;
          const sequenceId = message.sequence_id ?? message.sequenceId;
          const timestamp = message.server_timestamp ?? message.timestamp;

          return (
            <article
              className={`chat__message${isOwn ? ' chat__message--own' : ''}`}
              key={sequenceId ?? `${messageUserId ?? 'guest'}-${index}`}
            >
              <div className="chat__meta">
                <span>{getUserName(messageUserId)}</span>
                <time dateTime={getMessageDate(timestamp).toISOString()}>
                  {formatTime(timestamp)}
                </time>
              </div>
              <p className="chat__bubble">{message.text}</p>
            </article>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form className="chat__form" onSubmit={handleSubmit}>
        <input
          className="chat__input"
          onChange={(event) => setText(event.target.value)}
          placeholder="Message room"
          type="text"
          value={text}
        />
        <button className="button chat__send" type="submit">
          Send
        </button>
      </form>
    </section>
  );
}
