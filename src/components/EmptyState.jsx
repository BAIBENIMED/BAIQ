export function EmptyState({ icon = 'info', title, message, maxWidth = 450 }) {
  return (
    <div className="card fade-in" style={{ maxWidth, margin: '60px auto', textAlign: 'center', padding: '48px 32px' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 52, color: 'var(--border-mid)', display: 'block', marginBottom: 16 }}>{icon}</span>
      <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 8 }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>{message}</p>
    </div>
  );
}
