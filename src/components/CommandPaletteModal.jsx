import { useState, useEffect, useMemo, useRef } from 'react';

export function CommandPaletteModal({ isOpen, onClose, onNavigate, rows = [], data = {}, onExportExcel, onExportPDF, onTogglePresentation, isSimulationActive, setIsSimulationActive }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  // Mémorise l'état "ouvert" du rendu précédent, en state (et non en ref) pour rester
  // compatible avec les règles React Compiler qui interdisent l'accès à .current pendant le rendu.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Réinitialise la recherche pendant le rendu lorsque la modale s'ouvre : pattern officiel
  // React ("ajuster l'état pendant le rendu") qui évite le re-rendu en cascade que provoquerait
  // un setState synchrone dans un useEffect.
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }

  // Ici, l'effect ne fait que synchroniser avec le DOM (focus) : c'est légitime.
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Items searchable
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const results = [];

    // 1. Navigation Pages
    const pages = [
      { id: 'dashboard',   label: "Vue d'ensemble — Tableau de bord", icon: 'dashboard', category: 'Navigation' },
      { id: 'balance',     label: 'Balance Générale — Grand Livre',  icon: 'account_balance', category: 'Navigation' },
      { id: 'audit',       label: 'Audit Balance SCF — Conformité & Flux', icon: 'fact_check', category: 'Navigation' },
      { id: 'bilan',       label: 'Bilan Fonctionnel — Masses & Équilibre', icon: 'account_tree', category: 'Navigation' },
      { id: 'sig',         label: 'SIG & TCR — Compte de Résultat SCF', icon: 'analytics', category: 'Navigation' },
      { id: 'capitaux',    label: 'Capitaux Propres — Tableau TVCP', icon: 'account_balance_wallet', category: 'Navigation' },
      { id: 'stocks',      label: 'Variation des Stocks — Déstockage / Stockage', icon: 'warehouse', category: 'Navigation' },
      { id: 'ratios',      label: 'Ratios Financiers, Solvabilité & Rating', icon: 'query_stats', category: 'Navigation' },
      { id: 'whatif',      label: 'Simulateur What-If — Écritures en partie double', icon: 'tune', category: 'Navigation' },
      { id: 'reports',     label: 'Rapports & Diagnostics IA Gemini', icon: 'description', category: 'Navigation' },
      { id: 'ai',          label: 'Assistant IA Financier', icon: 'smart_toy', category: 'Navigation' },
      { id: 'settings',    label: 'Paramètres & Configuration Secteur', icon: 'settings', category: 'Navigation' },
    ];

    pages.forEach(p => {
      if (!q || p.label.toLowerCase().includes(q) || p.id.includes(q)) {
        results.push({ ...p, type: 'page', action: () => { onNavigate(p.id); onClose(); } });
      }
    });

    // 2. Actions Rapides
    const actions = [
      { id: 'act_presentation', label: 'Lancer le Mode Présentation DAF (Plein Écran)', icon: 'slideshow', category: 'Actions Rapides', action: () => { onTogglePresentation(); onClose(); } },
      { id: 'act_excel',        label: 'Télécharger le Classeur Excel (.xlsx — 6 Feuilles)', icon: 'table_view', category: 'Actions Rapides', action: () => { onExportExcel?.(); onClose(); } },
      { id: 'act_pdf',          label: 'Générer le Rapport PDF Officiel (7 sections)', icon: 'picture_as_pdf', category: 'Actions Rapides', action: () => { onExportPDF?.(); onClose(); } },
      { id: 'act_simul',        label: isSimulationActive ? 'Désactiver le Mode Simulation What-If' : 'Activer le Mode Simulation What-If', icon: 'edit_note', category: 'Actions Rapides', action: () => { setIsSimulationActive?.(!isSimulationActive); onClose(); } },
    ];

    actions.forEach(a => {
      if (!q || a.label.toLowerCase().includes(q)) {
        results.push({ ...a, type: 'action' });
      }
    });

    // 3. Agrégats & Indicateurs Clés
    const b = data?.bilan || {};
    const s = data?.sig || {};
    const r = data?.ratios || {};

    const aggregates = [
      { id: 'agg_frng', label: `FRNG (Fonds de Roulement) : ${Math.round(b.frng || 0).toLocaleString('fr-FR')} DZD`, sub: 'Ressources Stables − Emplois Stables', icon: 'account_tree', category: 'Agrégats', page: 'bilan' },
      { id: 'agg_bfr',  label: `BFR (Besoin en Fonds de Roulement) : ${Math.round(b.bfr || 0).toLocaleString('fr-FR')} DZD`, sub: 'Actif Circulant − Passif Circulant', icon: 'timelapse', category: 'Agrégats', page: 'bilan' },
      { id: 'agg_tn',   label: `Trésorerie Nette : ${Math.round(b.tn || 0).toLocaleString('fr-FR')} DZD`, sub: 'FRNG − BFR', icon: 'account_balance_wallet', category: 'Agrégats', page: 'bilan' },
      { id: 'agg_ca',   label: `Chiffre d'Affaires : ${Math.round(s.chiffreAffaires || 0).toLocaleString('fr-FR')} DZD`, sub: 'Production vendue (Classe 70)', icon: 'payments', category: 'Agrégats', page: 'sig' },
      { id: 'agg_ebe',  label: `EBE (Excédent Brut d'Exploitation) : ${Math.round(s.ebe || 0).toLocaleString('fr-FR')} DZD`, sub: 'Marge opérationnelle brute', icon: 'trending_up', category: 'Agrégats', page: 'sig' },
      { id: 'agg_rn',   label: `Résultat Net : ${Math.round(s.resultatNet || 0).toLocaleString('fr-FR')} DZD`, sub: 'Solde final de l\'exercice', icon: 'verified', category: 'Agrégats', page: 'sig' },
      { id: 'agg_dso',  label: `DSO (Délai Recouvrement Clients) : ${Math.round(r.delaiRecouvrement || 0)} jours`, sub: 'Rotation des créances clients', icon: 'schedule', category: 'Agrégats', page: 'ratios' },
      { id: 'agg_dpo',  label: `DPO (Délai Règlement Fournisseurs) : ${Math.round(r.delaiFournisseurs || 0)} jours`, sub: 'Crédit accordé par les fournisseurs', icon: 'receipt_long', category: 'Agrégats', page: 'ratios' },
    ];

    aggregates.forEach(agg => {
      if (!q || agg.label.toLowerCase().includes(q) || (agg.sub && agg.sub.toLowerCase().includes(q))) {
        results.push({ ...agg, type: 'aggregate', action: () => { onNavigate(agg.page); onClose(); } });
      }
    });

    // 4. Comptes du Grand Livre (Classes 1 à 7)
    if (q && rows && rows.length > 0) {
      const matchingAccounts = rows
        .filter(r => !r.isTotal && r.compte && (String(r.compte).toLowerCase().includes(q) || (r.libelle && r.libelle.toLowerCase().includes(q))))
        .slice(0, 10);

      matchingAccounts.forEach(c => {
        const solde = c.solde !== undefined ? c.solde : ((c.soldeFinDebit || 0) - (c.soldeFinCredit || 0));
        results.push({
          id: `acc_${c.compte}`,
          label: `${c.compte} — ${c.libelle || 'Compte'}`,
          sub: `Solde : ${Math.round(Math.abs(solde)).toLocaleString('fr-FR')} DZD (${solde >= 0 ? 'DÉBITEUR' : 'CRÉDITEUR'})`,
          icon: 'menu_book',
          category: 'Comptes (Grand Livre)',
          type: 'account',
          action: () => { onNavigate('balance'); onClose(); }
        });
      });
    }

    return results;
  }, [query, rows, data, isSimulationActive]);

  // Keyboard navigation inside the palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, searchResults.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          searchResults[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '80px 16px 20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 640,
          background: 'var(--surface)',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: '80vh'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-alt)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)' }}>search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Rechercher compte (411, 512), agrégat (EBE, FRNG), écran ou action..."
            style={{
              flex: 1, border: 'none', background: 'transparent',
              fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)',
              outline: 'none'
            }}
          />
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-sub)', background: 'var(--surface)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
            ESC
          </span>
        </div>

        {/* Results List */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
          {searchResults.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--text-sub)', marginBottom: 8 }}>search_off</span>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Aucun résultat trouvé pour « {query} »</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: 4 }}>Essayez un numéro de compte (ex: 700, 401), un ratio (ex: DSO, EBE) ou une action.</div>
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id || idx}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    marginBottom: 3,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    background: isSelected ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(37, 99, 235, 0.3)' : 'transparent'}`,
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: isSelected ? 'var(--primary)' : 'var(--surface-alt)',
                      color: isSelected ? '#fff' : 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{item.icon}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </div>
                      {item.sub && (
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.sub}
                        </div>
                      )}
                    </div>
                  </div>

                  <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-sub)', background: 'var(--surface-alt)', padding: '2px 7px', borderRadius: 6, flexShrink: 0 }}>
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div style={{ padding: '8px 18px', background: 'var(--surface-alt)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span><strong style={{ color: 'var(--text)' }}>↑↓</strong> Naviguer</span>
            <span><strong style={{ color: 'var(--text)' }}>↵</strong> Sélectionner</span>
            <span><strong style={{ color: 'var(--text)' }}>ESC</strong> Fermer</span>
          </div>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>BAIQ Command Palette</span>
        </div>
      </div>
    </div>
  );
}
