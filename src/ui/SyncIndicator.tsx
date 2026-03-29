// SyncIndicator — non-intrusive iCloud sync status

interface SyncIndicatorProps {
  status: 'up_to_date' | 'syncing' | 'error';
}

const statusColors: Record<string, string> = {
  up_to_date: '#1a3a1a',
  syncing: '#3a3a1a',
  error: '#3a1a1a',
};

export function SyncIndicator({ status }: SyncIndicatorProps) {
  if (status === 'up_to_date') return null;

  return (
    <div style={{
      position: 'fixed',
      top: '8px',
      right: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      zIndex: 200,
    }}>
      <div style={{
        width: '5px',
        height: '5px',
        borderRadius: '50%',
        background: statusColors[status],
        boxShadow: `0 0 4px ${statusColors[status]}`,
        animation: status === 'syncing' ? 'blink 1.5s infinite' : 'none',
      }} />
      <span style={{
        fontFamily: '"SF Mono", monospace',
        fontSize: '8px',
        color: '#666',
        letterSpacing: '0.1em',
      }}>
        {status === 'syncing' ? 'SYNC' : 'ERRORE SYNC'}
      </span>
    </div>
  );
}
