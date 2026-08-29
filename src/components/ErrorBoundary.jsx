import { Component } from 'react';

/**
 * Filet de sécurité applicatif : capture toute erreur de rendu non gérée
 * (ex: variable non définie, hook mal utilisé) et affiche un écran de secours
 * au lieu de laisser l'application entière planter en écran blanc.
 *
 * Les dossiers déjà sauvegardés restent intacts dans localStorage — seul l'état
 * en mémoire de la session en cours est perdu.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Erreur applicative capturée par ErrorBoundary :', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', padding: 24, fontFamily: 'inherit'
      }}>
        <div style={{
          maxWidth: 480, width: '100%', background: '#ffffff', borderRadius: 16,
          padding: 32, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)', border: '1px solid #fecaca'
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: '#fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#dc2626' }}>error</span>
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
            Une erreur inattendue est survenue
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
            L'application a rencontré un problème et n'a pas pu continuer. Vos dossiers déjà enregistrés
            ne sont pas affectés. Vous pouvez recharger l'application pour reprendre votre travail.
          </p>
          {this.state.error?.message && (
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '10px 12px', marginBottom: 20, fontSize: '0.74rem', fontFamily: 'monospace',
              color: '#94a3b8', wordBreak: 'break-word'
            }}>
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleReload}
            style={{
              width: '100%', padding: '10px 16px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #1b6e8c, #1d4ed8)', color: '#ffffff',
              fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Recharger l'application
          </button>
        </div>
      </div>
    );
  }
}
