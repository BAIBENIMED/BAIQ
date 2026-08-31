import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MODEL_TEMPLATES, MAX_SCENARIOS, createScenario, createSimulationEntryFromLines, recalculateSimulatedDataset } from '../utils/simulationEngine';
import { generateFullPDF } from '../utils/pdfExporter';
import { useEscapeKey } from '../utils/useEscapeKey';

const SCENARIO_COLORS = ['#1b6e8c', '#c08a2e', '#7c3aed'];

const INDICATORS = [
  { key: 'ca',   label: "Chiffre d'Affaires",     get: (d) => d.sig?.chiffreAffaires || 0, up: true },
  { key: 'ebe',  label: 'EBE',                     get: (d) => d.sig?.ebe || 0,             up: true },
  { key: 'net',  label: 'Résultat Net',            get: (d) => d.sig?.resultatNet || 0,     up: true },
  { key: 'frng', label: 'FRNG',                    get: (d) => d.bilan?.frng || 0,          up: true },
  { key: 'bfr',  label: 'BFR',                     get: (d) => d.bilan?.bfr || 0,           up: false },
  { key: 'tn',   label: 'Trésorerie Nette',        get: (d) => d.bilan?.tn || 0,            up: true },
];

export function WhatIfSimulator({ data, scenarios = [], setScenarios, activeScenarioId, setActiveScenarioId, formatCurrency, cur }) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(activeScenarioId || scenarios[0]?.id || null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [printingId, setPrintingId] = useState(null);

  // Modèles d'écritures — point d'entrée unique de saisie
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  // Fenêtre de saisie du montant avant application d'un modèle
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [templateAmount, setTemplateAmount] = useState('');
  useEscapeKey(!!pendingTemplate, () => setPendingTemplate(null));

  // Éditeur Multiligne Avancé
  const [editingId, setEditingId]           = useState(null);
  const [templateError, setTemplateError]   = useState(null);
  const [isEditorOpen, setIsEditorOpen]     = useState(false);
  useEscapeKey(isEditorOpen, () => setIsEditorOpen(false));
  const [opLabel, setOpLabel]               = useState('Nouvelle opération');
  const [editorLines, setEditorLines]       = useState([
    { compte: '411', libelle: 'Clients & comptes rattachés', debit: 5000000, credit: 0 },
    { compte: '700', libelle: 'Ventes de marchandises', debit: 0, credit: 5000000 },
  ]);

  const fmt = formatCurrency || ((v) => (v || 0).toLocaleString('fr-FR') + ' DA');
  const fmtPct = (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;

  if (!data || !data.sig || !data.bilan) {
    return (
      <div className="card fade-in" style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center', padding: 40 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-sub)', marginBottom: 12 }}>tune</span>
        <h3 style={{ fontWeight: 800 }}>Simulateur non disponible</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Veuillez importer une balance comptable pour lancer des simulations en partie double.</p>
      </div>
    );
  }

  const effectiveSelected = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0] || null;

  // --- GESTION DES SCÉNARIOS (max 3) ---
  const handleCreateScenario = () => {
    if (scenarios.length >= MAX_SCENARIOS) return;
    const s = createScenario(`Scénario ${scenarios.length + 1}`);
    setScenarios(prev => [...prev, s]);
    setSelectedScenarioId(s.id);
  };

  const handleDeleteScenario = (id) => {
    const remaining = scenarios.filter(s => s.id !== id);
    setScenarios(remaining);
    if (activeScenarioId === id) setActiveScenarioId(null);
    if (selectedScenarioId === id) setSelectedScenarioId(remaining[0]?.id || null);
  };

  const handleStartRename = (s) => { setRenamingId(s.id); setRenameDraft(s.name); };
  const handleCommitRename = () => {
    if (renamingId) {
      setScenarios(prev => prev.map(s => s.id === renamingId ? { ...s, name: renameDraft.trim() || s.name } : s));
    }
    setRenamingId(null);
  };

  const handlePrintScenario = async (scenario) => {
    setPrintingId(scenario.id);
    try {
      const scenarioResult = recalculateSimulatedDataset(data, scenario.entries);
      await generateFullPDF(scenarioResult, cur, true, scenario.name);
    } catch (e) {
      console.error('Erreur export PDF du scénario:', e);
      alert('Erreur lors de la génération du PDF : ' + (e?.message || 'Erreur inconnue'));
    } finally {
      setPrintingId(null);
    }
  };

  // Applique une transformation aux écritures du scénario actuellement consulté
  const updateSelectedEntries = (updater) => {
    if (!effectiveSelected) return;
    setScenarios(prev => prev.map(s => s.id === effectiveSelected.id ? { ...s, entries: updater(s.entries) } : s));
  };

  // --- OUVRIR / FERMER L'ÉDITEUR AVANCÉ ---
  const handleOpenNewEditor = () => {
    setEditingId(null);
    setOpLabel('Nouvelle opération comptable');
    setEditorLines([
      { compte: '411', libelle: 'Clients & comptes rattachés', debit: 5000000, credit: 0 },
      { compte: '700', libelle: 'Ventes de marchandises', debit: 0, credit: 5000000 },
    ]);
    setIsEditorOpen(true);
  };

  const handleOpenEditEditor = (entry) => {
    setEditingId(entry.id);
    setOpLabel(entry.label);
    if (entry.lines && entry.lines.length > 0) {
      setEditorLines(entry.lines.map(l => ({ ...l })));
    } else {
      setEditorLines([
        { compte: entry.debitCompte || '411', libelle: 'Débit', debit: entry.montant, credit: 0 },
        { compte: entry.creditCompte || '700', libelle: 'Crédit', debit: 0, credit: entry.montant },
      ]);
    }
    setIsEditorOpen(true);
  };

  // --- MODÈLES : le montant par défaut du modèle (avant ajustement utilisateur) ---
  const templateDefaultAmount = (tpl) => Math.max(
    tpl.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0),
    tpl.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  );

  // --- OUVRIR LA FENÊTRE DE SAISIE DU MONTANT AVANT DE CRÉER LA PIÈCE ---
  const handleOpenTemplateAmount = (tpl) => {
    setTemplateError(null);
    setPendingTemplate(tpl);
    setTemplateAmount(String(templateDefaultAmount(tpl)));
  };

  // --- CRÉER LA PIÈCE À PARTIR DU MODÈLE, MISE À L'ÉCHELLE SUR LE MONTANT SAISI ---
  // Les lignes du modèle sont mises à l'échelle proportionnellement (et non simplement
  // remplacées) pour préserver les ratios internes des modèles multilignes (ex: TVA à 19%
  // répartie entre Client TTC / Vente HT / TVA collectée).
  const handleApplyTemplate = () => {
    const tpl = pendingTemplate;
    if (!tpl) return;
    const amount = Number(templateAmount);
    if (!(amount > 0)) return;

    const original = templateDefaultAmount(tpl);
    const factor = original > 0 ? amount / original : 1;
    const scaledLines = tpl.lines.map(l => ({
      ...l,
      debit: Math.round((Number(l.debit) || 0) * factor),
      credit: Math.round((Number(l.credit) || 0) * factor),
    }));

    const newEntry = createSimulationEntryFromLines({
      label: tpl.name,
      lines: scaledLines,
    });
    if (!newEntry.isBalanced) {
      setTemplateError(`Le modèle "${tpl.name}" est déséquilibré (Débit ≠ Crédit) et n'a pas été appliqué. Merci de le corriger dans le code du modèle.`);
      setPendingTemplate(null);
      return;
    }
    setTemplateError(null);
    updateSelectedEntries(entries => [...entries, newEntry]);
    setPendingTemplate(null);
  };

  // --- HANDLERS ÉDITEUR LIGNES ---
  const handleAddLine = (type = 'debit') => {
    if (type === 'debit') {
      setEditorLines(prev => [...prev, { compte: '600', libelle: 'Charge ou Débit', debit: 1000000, credit: 0 }]);
    } else {
      setEditorLines(prev => [...prev, { compte: '512', libelle: 'Banque ou Crédit', debit: 0, credit: 1000000 }]);
    }
  };

  const handleRemoveLine = (idx) => {
    if (editorLines.length <= 2) return;
    setEditorLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx, field, val) => {
    setEditorLines(prev => prev.map((l, i) => {
      if (i === idx) {
        return { ...l, [field]: val };
      }
      return l;
    }));
  };

  // Calcul équilibre Débit vs Crédit
  const sumDebit  = editorLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const sumCredit = editorLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const diffDC     = Math.abs(sumDebit - sumCredit);
  const isBalanced = diffDC < 0.01;
  // Une ligne au compte vide est appliquée nulle part (silencieusement ignorée par le moteur de
  // simulation) : l'écriture resterait déséquilibrée en pratique même si D = C sur le papier.
  const hasEmptyAccount = editorLines.some(l => !String(l.compte || '').trim());
  const canSave = isBalanced && !hasEmptyAccount;

  // --- SAUVEGARDER L'ÉCRITURE DANS LE JOURNAL DU SCÉNARIO CONSULTÉ ---
  const handleSaveEntry = () => {
    if (!canSave) return;

    if (editingId) {
      updateSelectedEntries(entries => entries.map(e => {
        if (e.id === editingId) {
          const cleanLines = editorLines.map(l => ({
            compte: String(l.compte).trim(),
            libelle: String(l.libelle).trim(),
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
          }));
          const maxM = Math.max(sumDebit, sumCredit);
          return {
            ...e,
            label: opLabel.trim() || 'Opération modifiée',
            lines: cleanLines,
            montant: maxM,
            isBalanced: true,
          };
        }
        return e;
      }));
    } else {
      const newEntry = createSimulationEntryFromLines({
        label: opLabel.trim() || 'Nouvelle opération',
        lines: editorLines,
      });
      updateSelectedEntries(entries => [...entries, newEntry]);
    }

    setIsEditorOpen(false);
  };

  // --- SUPPRIMER UNE ÉCRITURE ---
  const handleRemoveEntry = (id) => {
    updateSelectedEntries(entries => entries.filter(e => e.id !== id));
  };

  // Résultat recalculé de CHAQUE scénario existant (pour le tableau comparatif & le graphique)
  const scenarioResults = scenarios.map((s, idx) => ({
    scenario: s,
    color: SCENARIO_COLORS[idx % SCENARIO_COLORS.length],
    result: s.entries.length > 0 ? recalculateSimulatedDataset(data, s.entries) : data,
  }));

  // Données du scénario actuellement consulté (cartes KPI + journal)
  const consultedResult = effectiveSelected
    ? (scenarioResults.find(sr => sr.scenario.id === effectiveSelected.id)?.result || data)
    : data;

  const baseCA  = data.sig.chiffreAffaires || 1;
  const baseEBE = data.sig.ebe || 0;
  const baseNet = data.sig.resultatNet || 0;
  const baseBFR = data.bilan.bfr || 0;
  const baseTN  = data.bilan.tn || 0;

  const simCA  = consultedResult.sig.chiffreAffaires || 0;
  const simEBE = consultedResult.sig.ebe || 0;
  const simNet = consultedResult.sig.resultatNet || 0;
  const simBFR = consultedResult.bilan.bfr || 0;
  const simTN  = consultedResult.bilan.tn || 0;

  const totalSimulatedDebit = (effectiveSelected?.entries || []).reduce((sum, e) => sum + (Number(e.montant) || 0), 0);

  const categories = ['Tous', 'Ventes', 'Achats', 'Personnel', 'Investissement', 'Financement', 'Trésorerie', 'Provisions', 'Clôture'];
  const filteredTemplates = selectedCategory === 'Tous'
    ? MODEL_TEMPLATES
    : MODEL_TEMPLATES.filter(t => t.category === selectedCategory);

  // Graphique : une série par scénario existant
  const chartData = [
    { name: "Chiffre d'Affaires", key: 'ca' },
    { name: 'EBE', key: 'ebe' },
    { name: 'Résultat Net', key: 'net' },
    { name: 'BFR', key: 'bfr' },
    { name: 'Trésorerie Nette', key: 'tn' },
  ].map(({ name, key }) => {
    const ind = INDICATORS.find(i => i.key === key);
    const row = { name, Actuel: Math.round(ind.get(data)) };
    scenarioResults.forEach(({ scenario, result }) => { row[scenario.name] = Math.round(ind.get(result)); });
    return row;
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>

      {/* Header */}
      <div>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: 8, padding: '3px 9px', color: '#fff', fontSize: '0.70rem', fontWeight: 800 }}>
            MOTEUR EN PARTIE DOUBLE
          </span>
          Simulateur What-If — Scénarios
        </div>
        <div className="section-sub" style={{ marginBottom: 0 }}>
          Créez jusqu'à {MAX_SCENARIOS} scénarios, comparez-les à la situation actuelle, activez celui qui doit s'appliquer à toute la plateforme, consultez ou imprimez n'importe lequel.
        </div>
      </div>

      {/* ── BARRE D'ONGLETS DE SCÉNARIOS ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {scenarios.map((s, idx) => {
          const isSelected = s.id === effectiveSelected?.id;
          const isActive = s.id === activeScenarioId;
          const color = SCENARIO_COLORS[idx % SCENARIO_COLORS.length];
          return (
            <div
              key={s.id}
              onClick={() => setSelectedScenarioId(s.id)}
              role="tab"
              aria-selected={isSelected}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${isSelected ? color : 'var(--border)'}`,
                background: isSelected ? `color-mix(in srgb, ${color} 12%, var(--surface))` : 'var(--surface)',
                transition: 'all 0.15s'
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
              {renamingId === s.id ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={e => setRenameDraft(e.target.value)}
                  onBlur={handleCommitRename}
                  onKeyDown={e => { if (e.key === 'Enter') handleCommitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: '0.85rem', fontWeight: 800, border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', width: 120, outline: 'none' }}
                />
              ) : (
                <span
                  onDoubleClick={(e) => { e.stopPropagation(); handleStartRename(s); }}
                  title="Double-cliquer pour renommer"
                  style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)' }}
                >
                  {s.name}
                </span>
              )}
              {isActive && <span className="badge badge-green" style={{ fontSize: '0.58rem', padding: '1px 6px' }}>ACTIF</span>}

              <div style={{ display: 'flex', gap: 2, marginLeft: 2 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); isActive ? setActiveScenarioId(null) : setActiveScenarioId(s.id); }}
                  aria-label={isActive ? `Désactiver ${s.name} (revenir au Mode Réel)` : `Activer ${s.name} sur toute l'application`}
                  title={isActive ? 'Désactiver (Mode Réel)' : "Activer ce scénario sur toute l'appli"}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: isActive ? 'var(--green)' : 'var(--text-muted)', display: 'flex', padding: 2 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{isActive ? 'toggle_on' : 'toggle_off'}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrintScenario(s); }}
                  disabled={printingId === s.id}
                  aria-label={`Imprimer le scénario ${s.name}`}
                  title="Imprimer ce scénario (PDF)"
                  style={{ border: 'none', background: 'none', cursor: printingId === s.id ? 'wait' : 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{printingId === s.id ? 'hourglass_empty' : 'print'}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteScenario(s.id); }}
                  aria-label={`Supprimer le scénario ${s.name}`}
                  title="Supprimer ce scénario"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red)', display: 'flex', padding: 2 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            </div>
          );
        })}

        {scenarios.length < MAX_SCENARIOS ? (
          <button
            onClick={handleCreateScenario}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px dashed var(--border)', background: 'var(--surface-alt)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.80rem', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Nouveau Scénario
          </button>
        ) : (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0 4px' }}>
            Maximum {MAX_SCENARIOS} scénarios — supprimez-en un pour en créer un nouveau
          </span>
        )}
      </div>

      {scenarios.length === 0 ? (
        <div className="card" style={{ maxWidth: 520, margin: '30px auto', textAlign: 'center', padding: 40 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 44, color: 'var(--primary)', marginBottom: 12, display: 'block' }}>science</span>
          <h3 style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: 8 }}>Créez votre premier scénario</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.90rem', marginBottom: 20 }}>
            Testez l'impact d'une vente, d'un emprunt ou d'une charge sur votre Bilan, votre SIG et vos Ratios — sans jamais toucher à vos données réelles.
          </p>
          <button onClick={handleCreateScenario} className="btn btn-primary" style={{ margin: '0 auto' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Créer mon premier scénario
          </button>
        </div>
      ) : (
        <>
          {/* 💡 MODÈLES D'ÉCRITURES — point d'entrée unique de saisie */}
          <div className="card" style={{ padding: 20, border: '1px solid #c084fc', background: '#faf5ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#581c87', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#7c3aed' }}>auto_fix_high</span>
                Ajouter une opération à « {effectiveSelected?.name} »
              </h3>
              <button
                onClick={handleOpenNewEditor}
                style={{
                  padding: '7px 14px', background: '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>add_circle</span>
                Nouvelle Pièce Simulation
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#6b21a8', margin: '0 0 14px', opacity: 0.85 }}>
              Choisissez un modèle d'écriture prédéfini — l'écriture en partie double est générée et équilibrée automatiquement.
            </p>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    fontSize: '0.70rem', padding: '3px 8px', borderRadius: 16,
                    border: `1px solid ${selectedCategory === cat ? '#7c3aed' : '#e9d5ff'}`,
                    background: selectedCategory === cat ? '#7c3aed' : '#fff',
                    color: selectedCategory === cat ? '#fff' : '#6b21a8',
                    fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {templateError && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 8,
                background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.74rem', marginBottom: 12
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0 }}>error</span>
                <span style={{ flex: 1 }}>{templateError}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
              {filteredTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => handleOpenTemplateAmount(tpl)}
                  title={tpl.description}
                  style={{
                    background: '#ffffff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '8px 10px',
                    cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8
                  }}
                  className="card-hover-effect"
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#4c1d95', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tpl.name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#7c3aed', opacity: 0.8 }}>
                      Comptes {tpl.lines[0].compte} / {tpl.lines[1].compte}
                    </div>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#7c3aed', flexShrink: 0 }}>arrow_forward</span>
                </div>
              ))}
            </div>
          </div>

          {/* 💰 FENÊTRE DE SAISIE DU MONTANT AVANT CRÉATION DE LA PIÈCE MODÈLE */}
          {pendingTemplate && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Montant de la pièce simulée"
              style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
              }}
              onClick={() => setPendingTemplate(null)}
            >
              <div
                style={{
                  width: '100%', maxWidth: 420,
                  background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)'
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#7c3aed', letterSpacing: '0.06em', marginBottom: 3 }}>
                      Modèle sélectionné
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>{pendingTemplate.name}</h3>
                  </div>
                  <button onClick={() => setPendingTemplate(null)} aria-label="Fermer" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                  </button>
                </div>

                <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{pendingTemplate.description}</p>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                      Montant de la pièce
                    </label>
                    <input
                      type="number"
                      autoFocus
                      value={templateAmount}
                      onChange={e => setTemplateAmount(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && Number(templateAmount) > 0) handleApplyTemplate(); }}
                      placeholder="Ex: 500000"
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '1rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }}
                    />
                    {pendingTemplate.lines.length > 2 && (
                      <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: 'var(--text-sub)' }}>
                        Modèle à plusieurs lignes : les montants de chaque ligne sont mis à l'échelle proportionnellement (ex: TVA recalculée automatiquement).
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    onClick={() => setPendingTemplate(null)}
                    style={{ padding: '8px 16px', background: 'var(--surface-alt)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleApplyTemplate}
                    disabled={!(Number(templateAmount) > 0)}
                    style={{
                      padding: '8px 18px', background: Number(templateAmount) > 0 ? '#7c3aed' : 'var(--border-mid)',
                      color: '#fff', border: 'none', borderRadius: 8, cursor: Number(templateAmount) > 0 ? 'pointer' : 'not-allowed',
                      fontWeight: 800, fontSize: '0.85rem'
                    }}
                  >
                    Créer la pièce
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 📝 ÉDITEUR MULTILIGNE (Nouvelle Pièce Simulation / modification) */}
          {isEditorOpen && (
            <div className="card fade-in" style={{ padding: 20, border: '2px solid var(--primary)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 20 }}>edit_note</span>
                  {editingId ? "Modification de l'Écriture Simulée" : "Saisie d'une Nouvelle Écriture Multiligne"}
                </h3>
                <button onClick={() => setIsEditorOpen(false)} aria-label="Fermer l'éditeur d'écriture" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                  Libellé / Motif de l'Écriture
                </label>
                <input
                  type="text"
                  value={opLabel}
                  onChange={e => setOpLabel(e.target.value)}
                  placeholder="Ex: Vente de marchandises au comptant"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, outline: 'none', background: 'var(--surface)' }}
                />
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', minWidth: 560, tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>COMPTE (3 CH.)</th>
                      <th style={{ width: '38%' }}>INTITULÉ COMPTE</th>
                      <th className="right" style={{ width: '17%', color: 'var(--green)' }}>DÉBIT</th>
                      <th className="right" style={{ width: '17%', color: 'var(--primary-dk)' }}>CRÉDIT</th>
                      <th style={{ width: '6%', textAlign: 'center' }}>✕</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editorLines.map((line, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            value={line.compte}
                            onChange={e => handleLineChange(idx, 'compte', e.target.value)}
                            placeholder="700"
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.80rem', fontWeight: 800, outline: 'none', background: 'var(--surface)', color: 'var(--text)' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={line.libelle}
                            onChange={e => handleLineChange(idx, 'libelle', e.target.value)}
                            placeholder="Intitulé"
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.80rem', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }}
                          />
                        </td>
                        <td className="right">
                          <input
                            type="number"
                            value={line.debit || ''}
                            onChange={e => handleLineChange(idx, 'debit', Number(e.target.value))}
                            placeholder="0"
                            style={{ width: '100%', textAlign: 'right', padding: '4px 6px', border: '1px solid var(--green)', borderRadius: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.80rem', fontWeight: 800, color: 'var(--green)', outline: 'none' }}
                          />
                        </td>
                        <td className="right">
                          <input
                            type="number"
                            value={line.credit || ''}
                            onChange={e => handleLineChange(idx, 'credit', Number(e.target.value))}
                            placeholder="0"
                            style={{ width: '100%', textAlign: 'right', padding: '4px 6px', border: '1px solid var(--primary)', borderRadius: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.80rem', fontWeight: 800, color: 'var(--primary-dk)', outline: 'none' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveLine(idx)}
                            disabled={editorLines.length <= 2}
                            aria-label="Supprimer cette ligne"
                            style={{ border: 'none', background: 'none', cursor: editorLines.length <= 2 ? 'not-allowed' : 'pointer', color: editorLines.length <= 2 ? 'var(--border-mid)' : 'var(--red)' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="2" style={{ fontWeight: 800, fontSize: '0.74rem' }}>TOTAL ÉCRITURE SIMULÉE</td>
                      <td className="right mono" style={{ fontWeight: 900, color: 'var(--green)', fontSize: '0.85rem' }}>{fmt(sumDebit)}</td>
                      <td className="right mono" style={{ fontWeight: 900, color: 'var(--primary-dk)', fontSize: '0.85rem' }}>{fmt(sumCredit)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleAddLine('debit')}
                    style={{ padding: '5px 10px', background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', borderRadius: 6, fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    + Ligne Débit
                  </button>
                  <button
                    onClick={() => handleAddLine('credit')}
                    style={{ padding: '5px 10px', background: '#f0f8fa', color: '#124f66', border: '1px solid #b7dce6', borderRadius: 6, fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    + Ligne Crédit
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {!isBalanced ? (
                    <span className="badge badge-red" style={{ fontSize: '0.74rem', padding: '4px 10px' }}>
                      ⚠ Écart: {fmt(diffDC)}
                    </span>
                  ) : hasEmptyAccount ? (
                    <span className="badge badge-red" style={{ fontSize: '0.74rem', padding: '4px 10px' }}>
                      ⚠ Numéro de compte manquant
                    </span>
                  ) : (
                    <span className="badge badge-green" style={{ fontSize: '0.74rem', padding: '4px 10px' }}>
                      ✓ Équilibrée (D = C)
                    </span>
                  )}

                  <button
                    onClick={handleSaveEntry}
                    disabled={!canSave}
                    style={{
                      padding: '8px 18px', background: canSave ? 'linear-gradient(135deg, #059669, #047857)' : 'var(--border-mid)',
                      color: '#fff', border: 'none', borderRadius: 8, cursor: canSave ? 'pointer' : 'not-allowed',
                      fontWeight: 800, fontSize: '0.85rem'
                    }}
                  >
                    {editingId ? 'Enregistrer' : 'Valider'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 📚 JOURNAL DES ÉCRITURES DU SCÉNARIO CONSULTÉ */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0 }}>Journal — {effectiveSelected?.name}</h3>
                <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{(effectiveSelected?.entries || []).length} écriture(s)</span>
              </div>

              {(effectiveSelected?.entries || []).length > 0 && (
                <button
                  onClick={() => updateSelectedEntries(() => [])}
                  style={{ border: 'none', background: 'none', color: 'var(--red)', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  × Vider ce scénario
                </button>
              )}
            </div>

            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table className="data-table compact-table" style={{ width: '100%', minWidth: 600, tableLayout: 'fixed', fontSize: '0.74rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '12%', padding: '8px 8px' }}>DATE</th>
                    <th style={{ width: '44%', padding: '8px 8px' }}>LIBELLÉ &amp; LIGNES COMPTABLES</th>
                    <th style={{ width: '16%', padding: '8px 8px' }}>COMPTES</th>
                    <th className="right" style={{ width: '16%', padding: '8px 8px' }}>MONTANT</th>
                    <th style={{ width: '12%', textAlign: 'center', padding: '8px 8px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {(effectiveSelected?.entries || []).length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
                        Aucune écriture dans ce scénario. Utilisez le <strong>panneau ci-dessus</strong> pour ajouter une opération.
                      </td>
                    </tr>
                  ) : (
                    effectiveSelected.entries.map((e) => (
                      <tr key={e.id}>
                        <td style={{ fontSize: '0.74rem', color: 'var(--text-muted)', verticalAlign: 'top', padding: '8px 8px' }}>
                          {e.date}
                        </td>

                        <td style={{ verticalAlign: 'top', padding: '8px 8px', wordBreak: 'break-word' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text)', marginBottom: 4 }}>{e.label}</div>

                          {e.lines && e.lines.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.7rem' }}>
                              {e.lines.map((l, li) => (
                                <div key={li} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-sub)', borderBottom: li < e.lines.length - 1 ? '1px dashed var(--border)' : 'none', paddingBottom: 1 }}>
                                  <span>
                                    <strong className="mono" style={{ color: l.debit > 0 ? 'var(--green)' : 'var(--primary-dk)' }}>{l.compte}</strong> — {l.libelle}
                                  </span>
                                  <span className="mono" style={{ fontWeight: 700, paddingLeft: 8 }}>
                                    {l.debit > 0 ? `D: ${fmt(l.debit)}` : `C: ${fmt(l.credit)}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              D: {e.debitCompte} | C: {e.creditCompte}
                            </div>
                          )}
                        </td>

                        <td style={{ verticalAlign: 'top', padding: '8px 8px' }}>
                          {e.lines && e.lines.length > 0 ? (
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                              {e.lines.map((l, li) => (
                                <span key={li} className="mono" style={{ fontSize: '0.65rem', background: l.debit > 0 ? '#dcfce7' : '#f0f8fa', color: l.debit > 0 ? '#166534' : '#124f66', padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>
                                  {l.compte}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="mono" style={{ fontSize: '0.74rem', fontWeight: 800 }}>{e.debitCompte} / {e.creditCompte}</span>
                          )}
                        </td>

                        <td className="right mono" style={{ verticalAlign: 'top', padding: '8px 8px', fontWeight: 900, color: 'var(--primary-dk)', fontSize: '0.85rem' }}>
                          {fmt(e.montant)}
                        </td>

                        <td style={{ verticalAlign: 'top', textAlign: 'center', padding: '8px 8px' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenEditEditor(e)}
                              title="Modifier cette écriture"
                              aria-label="Modifier cette écriture"
                              style={{ border: '1px solid #b7dce6', background: '#f0f8fa', color: '#124f66', borderRadius: 6, padding: '3px 7px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2 }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                            </button>

                            <button
                              onClick={() => handleRemoveEntry(e.id)}
                              title="Supprimer cette écriture"
                              aria-label="Supprimer cette écriture"
                              style={{ border: '1px solid #fecdd3', background: '#fff1f2', color: '#be123c', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2 }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {(effectiveSelected?.entries || []).length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan="3" style={{ fontWeight: 800, fontSize: '0.74rem', padding: '8px 8px' }}>TOTAL GÉNÉRAL DU JOURNAL</td>
                      <td className="right mono" style={{ fontWeight: 900, color: 'var(--primary-dk)', fontSize: '0.85rem', padding: '8px 8px' }}>{fmt(totalSimulatedDebit)}</td>
                      <td style={{ textAlign: 'center', padding: '8px 8px' }}>
                        <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>✓ D = C</span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* 📊 RECAPITULATIF DES IMPACTS DU SCÉNARIO CONSULTÉ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700 }}>CHIFFRE D'AFFAIRES (CA)</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 900, color: simCA >= baseCA ? 'var(--green)' : 'var(--red)', margin: '2px 0' }}>{fmt(simCA)}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Actuel: {fmt(baseCA)} ({fmtPct(baseCA ? ((simCA - baseCA) / baseCA) * 100 : 0)})</div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700 }}>EXCÉDENT BRUT (EBE)</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 900, color: simEBE >= baseEBE ? 'var(--green)' : 'var(--red)', margin: '2px 0' }}>{fmt(simEBE)}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Actuel: {fmt(baseEBE)}</div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700 }}>RÉSULTAT NET</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 900, color: simNet >= baseNet ? 'var(--green)' : 'var(--red)', margin: '2px 0' }}>{fmt(simNet)}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Actuel: {fmt(baseNet)}</div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700 }}>BFR (BESOIN EN FONDS)</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 900, color: simBFR <= baseBFR ? 'var(--green)' : 'var(--red)', margin: '2px 0' }}>{fmt(simBFR)}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Actuel: {fmt(baseBFR)}</div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700 }}>TRÉSORERIE NETTE (TN)</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 900, color: simTN >= baseTN ? 'var(--green)' : 'var(--red)', margin: '2px 0' }}>{fmt(simTN)}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Actuel: {fmt(baseTN)}</div>
            </div>
          </div>

          {/* 📋 TABLEAU COMPARATIF : SITUATION ACTUELLE VS TOUS LES SCÉNARIOS */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header">
              <h3 style={{ fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 18 }}>table_rows</span>
                Tableau Comparatif : Situation Actuelle vs Scénarios
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table compact-table" style={{ width: '100%', minWidth: 560 }}>
                <thead>
                  <tr>
                    <th>Indicateur</th>
                    <th className="right">Situation Actuelle</th>
                    {scenarioResults.map(({ scenario, color }) => (
                      <th key={scenario.id} className="right" style={{ color, borderBottom: `2px solid ${color}` }}>
                        {scenario.name}{scenario.id === activeScenarioId ? ' ✓' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {INDICATORS.map(ind => {
                    const baseVal = ind.get(data);
                    return (
                      <tr key={ind.key}>
                        <td style={{ fontWeight: 700 }}>{ind.label}</td>
                        <td className="right mono">{fmt(baseVal)}</td>
                        {scenarioResults.map(({ scenario, result }) => {
                          const val = ind.get(result);
                          const isBetter = ind.up ? val >= baseVal : val <= baseVal;
                          return (
                            <td key={scenario.id} className="right mono" style={{ color: val === baseVal ? 'var(--text)' : (isBetter ? 'var(--green)' : 'var(--red)'), fontWeight: 800 }}>
                              {fmt(val)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ fontWeight: 800, fontSize: '0.74rem' }}>ACTIONS</td>
                    <td></td>
                    {scenarioResults.map(({ scenario }) => (
                      <td key={scenario.id} style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button
                            onClick={() => setSelectedScenarioId(scenario.id)}
                            title={`Consulter ${scenario.name}`}
                            aria-label={`Consulter ${scenario.name}`}
                            style={{ border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text)', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', display: 'flex' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>visibility</span>
                          </button>
                          <button
                            onClick={() => scenario.id === activeScenarioId ? setActiveScenarioId(null) : setActiveScenarioId(scenario.id)}
                            title={scenario.id === activeScenarioId ? 'Désactiver' : 'Activer sur toute l\'appli'}
                            aria-label={scenario.id === activeScenarioId ? `Désactiver ${scenario.name}` : `Activer ${scenario.name}`}
                            style={{ border: '1px solid var(--green)', background: scenario.id === activeScenarioId ? 'var(--green)' : 'var(--surface-alt)', color: scenario.id === activeScenarioId ? '#fff' : 'var(--green)', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', display: 'flex' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{scenario.id === activeScenarioId ? 'check' : 'play_arrow'}</span>
                          </button>
                          <button
                            onClick={() => handlePrintScenario(scenario)}
                            disabled={printingId === scenario.id}
                            title={`Imprimer ${scenario.name}`}
                            aria-label={`Imprimer ${scenario.name}`}
                            style={{ border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text)', borderRadius: 6, padding: '3px 6px', cursor: printingId === scenario.id ? 'wait' : 'pointer', display: 'flex' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{printingId === scenario.id ? 'hourglass_empty' : 'print'}</span>
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Comparison Chart */}
          <div className="card" style={{ padding: 18 }}>
            <div className="card-header" style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 18 }}>bar_chart</span>
                Comparatif Visuel : Situation Actuelle vs Scénarios
              </h3>
            </div>

            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                    formatter={(val) => [fmt(val)]}
                  />
                  <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                  <Bar dataKey="Actuel" fill="var(--text-sub)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  {scenarioResults.map(({ scenario, color }) => (
                    <Bar key={scenario.id} dataKey={scenario.name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
