import { useEffect, useState } from 'react';

export default function ConnectionStatus({ status }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show when not connected
    setVisible(status && status !== 'connected');
  }, [status]);

  if (!visible) return null;

  const labels = {
    connecting: { text: 'Connecting...', color: '#f59e0b' },
    reconnecting: { text: 'Reconnecting...', color: '#f59e0b' },
    disconnected: { text: 'Disconnected', color: '#ef4444' },
  };

  const current = labels[status] || labels.connecting;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      background: '#1a1a2e',
      border: `1px solid ${current.color}`,
      borderRadius: '8px',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      color: current.color,
      zIndex: 999,
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: current.color,
        display: 'inline-block',
      }} />
      {current.text}
    </div>
  );
}
