import { useState } from 'react';
import { useEscapeKey } from '../utils/useEscapeKey';

export function PostImportConfigModal({ isOpen, onClose, data, cur, setCur, onUpdateProfil, onUpdateTvaRegime }) {
  const profil = data?.profil || {};
  const tvaRegime = profil.tvaRegime || { ventesFranchisees: false, achatsFranchises: false, tauxTva: 19 };

  const [nom, setNom] = useState(profil.nomEntreprise || 'Dossier Anonyme');
  const [effectif, setEffectif] = useState(profil.effectif || '');
  const [rounding, setRounding] = useState(profil.rounding ?? 0);

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateProfil({
      nomEntreprise: nom.trim() || 'Dossier Anonyme',
      effectif,
      rounding,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configuration du dossier"
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.06em', marginBottom: 3 }}>
              Balance importée — dernière étape
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
              Finaliser le dossier
            </h3>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Confidentiality banner */}
          <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--primary-lt2)', border: '1px solid var(--primary-lt)', borderRadius: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)', flexShrink: 0 }}>lock</span>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Ces informations servent uniquement à personnaliser vos <strong style={{ color: 'var(--text)' }}>documents imprimés
              (PDF / Excel)</strong>. Elles restent stockées dans le cache de ce navigateur — jamais envoyées à un serveur.
            </p>
          </div>

          {/* Nom entreprise */}
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Nom de l'entreprise (pour l'en-tête des documents)
            </label>
            <input
              value={nom}
              onChange={e => setNom(e.target.value)}
              placeholder="Dossier Anonyme"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.92rem', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }}
            />
          </div>

          {/* Effectif + Devise + Arrondi */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Effectif
              </label>
              <input
                type="number" min="0" value={effectif}
                onChange={e => setEffectif(e.target.value)}
                placeholder="Ex: 45"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.92rem', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Devise affichée
              </label>
              <input
                value={cur} onChange={e => setCur(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.92rem', fontFamily: 'JetBrains Mono, monospace', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Arrondi des montants
              </label>
              <select
                value={rounding} onChange={e => setRounding(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.92rem', fontWeight: 600, outline: 'none', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value={0}>Entier (1 234)</option>
                <option value={1}>1 décimale (1 234,5)</option>
                <option value={2}>2 décimales (1 234,50)</option>
              </select>
            </div>
          </div>

          {/* Régime TVA */}
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Régime TVA (délais clients / fournisseurs)
            </label>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
              Par défaut, ventes et achats sont considérés <strong style={{ color: 'var(--text)' }}>non franchisés</strong> (soumis
              à TVA) — cochez uniquement si une exonération légale s'applique réellement.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!tvaRegime.ventesFranchisees}
                onChange={e => onUpdateTvaRegime({ ventesFranchisees: e.target.checked })}
              />
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)' }}>Ventes en franchise de TVA (exonérées)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!tvaRegime.achatsFranchises}
                onChange={e => onUpdateTvaRegime({ achatsFranchises: e.target.checked })}
              />
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)' }}>Achats en franchise de TVA (exonérés)</span>
            </label>
            <select
              value={tvaRegime.tauxTva}
              onChange={e => onUpdateTvaRegime({ tauxTva: Number(e.target.value) })}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600, outline: 'none', background: 'var(--surface)', color: 'var(--text)' }}
            >
              <option value={19}>Taux de TVA applicable : 19 % — Taux normal</option>
              <option value={9}>Taux de TVA applicable : 9 % — Taux réduit</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface-alt)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Ignorer pour l'instant</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
