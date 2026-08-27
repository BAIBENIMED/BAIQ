import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, File, Download, Play, Sparkles, FolderOpen } from 'lucide-react';
import { parseFile, calculateBilanFonctionnel, calculateSIG, calculateRatios } from '../utils/financeCalculations';
import { SECTEURS } from '../utils/secteurs';
import { SAMPLE_BALANCES, downloadSampleExcel } from '../utils/sampleBalances';

export function ImportData({ onDataImported }) {
  // ── Unified Company Profile (Secteur par défaut: Industrie / Production) ──
  const [profil, setProfil] = useState({
    nomEntreprise: 'Dossier Anonyme',
    secteurId: 'industrie',
    effectif: '',
  });

  const [fileN, setFileN] = useState(null);
  const [fileN1, setFileN1] = useState(null);
  const [parsedN, setParsedN] = useState(null);
  const [parsedN1, setParsedN1] = useState(null);
  const [errorN, setErrorN] = useState(null);
  const [errorN1, setErrorN1] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null); // null, 'N' ou 'N-1'

  // ── Multi-Dossiers localStorage ──
  const [savedDossiers, setSavedDossiers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('finanalyze_saved_dossiers') || '[]');
    } catch {
      return [];
    }
  });

  const saveDossierToStorage = (payloadData) => {
    const dDate = new Date().toLocaleDateString('fr-FR');
    const dossierTitle = `${profil.nomEntreprise || 'Dossier'} - ${dDate}`;
    const newDossier = {
      id: Date.now().toString(),
      nom: dossierTitle,
      date: dDate,
      profil,
      data: payloadData,
    };
    const updated = [newDossier, ...savedDossiers];
    setSavedDossiers(updated);
    try {
      localStorage.setItem('finanalyze_saved_dossiers', JSON.stringify(updated));
    } catch (e) {
      console.warn('Erreur sauvegarde localStorage:', e);
    }
  };

  const deleteDossierFromStorage = (id, e) => {
    e.stopPropagation();
    const updated = savedDossiers.filter(d => d.id !== id);
    setSavedDossiers(updated);
    localStorage.setItem('finanalyze_saved_dossiers', JSON.stringify(updated));
  };

  const loadSavedDossier = (dossier) => {
    onDataImported(dossier.data);
  };

  // ── Handlers Exemples de Démonstration ──
  const handleLoadSample = (sample) => {
    setProfil({
      nomEntreprise: sample.title,
      secteurId: sample.secteurId,
      effectif: String(sample.effectif || ''),
    });
    setFileN({ name: `Balance_${sample.id}_N.xlsx` });
    setParsedN(sample.rowsN);
    setErrorN(null);
    if (sample.rowsN1 && sample.rowsN1.length > 0) {
      setFileN1({ name: `Balance_${sample.id}_N1.xlsx` });
      setParsedN1(sample.rowsN1);
      setErrorN1(null);
    } else {
      setFileN1(null);
      setParsedN1(null);
      setErrorN1(null);
    }
  };

  const handleQuickLaunchSample = (sample) => {
    const prof = {
      nomEntreprise: sample.title,
      secteurId: sample.secteurId,
      effectif: String(sample.effectif || ''),
    };
    const payloadN = { isBalance: true, rows: sample.rowsN };
    const bilanN   = calculateBilanFonctionnel(payloadN);
    const sigN     = calculateSIG(payloadN);
    const ratiosN  = calculateRatios(bilanN, sigN, sample.rowsN);

    let dataN1 = null;
    if (sample.rowsN1 && sample.rowsN1.length > 0) {
      const payloadN1 = { isBalance: true, rows: sample.rowsN1 };
      const bilanN1   = calculateBilanFonctionnel(payloadN1);
      const sigN1     = calculateSIG(payloadN1);
      const ratiosN1  = calculateRatios(bilanN1, sigN1, sample.rowsN1);
      dataN1 = { bilan: bilanN1, sig: sigN1, ratios: ratiosN1, rows: sample.rowsN1 };
    }

    const fullPayload = {
      bilan: bilanN,
      sig: sigN,
      ratios: ratiosN,
      rows: sample.rowsN,
      profil: prof,
      dataN1,
    };

    saveDossierToStorage(fullPayload);
    onDataImported(fullPayload);
  };

  // ── Handlers Profil ──
  const handleProfilChange = (field, val) => {
    setProfil(prev => ({ ...prev, [field]: val }));
  };

  // ── Handlers Fichiers ──
  const handleFileN = async (f) => {
    if (!f) return;
    setFileN(f);
    setErrorN(null);
    try {
      const data = await parseFile(f);
      if (!data || data.length === 0) {
        throw new Error("Aucune ligne de compte valide trouvée dans ce fichier.");
      }
      setParsedN(data);
    } catch (err) {
      console.error(`Erreur Fichier N: ${err.message}`);
      setErrorN(err.message || "Erreur de lecture du fichier.");
      setParsedN(null);
    }
  };

  const handleFileN1 = async (f) => {
    if (!f) return;
    setFileN1(f);
    setErrorN1(null);
    try {
      const data = await parseFile(f);
      if (!data || data.length === 0) {
        throw new Error("Aucune ligne de compte valide trouvée dans le fichier N-1.");
      }
      setParsedN1(data);
    } catch (err) {
      console.error(`Erreur Fichier N-1: ${err.message}`);
      setErrorN1(err.message || "Erreur de lecture du fichier N-1.");
      setParsedN1(null);
    }
  };

  // ── Toggle Ignore Lines ──
  const toggleIgnoreRow = (target, index) => {
    const setter = target === 'N' ? setParsedN : setParsedN1;
    setter(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ignore: !copy[index].ignore };
      return copy;
    });
  };

  // ── Final Launch Analysis ──
  const finishAndLaunch = () => {
    if (!parsedN) return;

    setTimeout(() => {
      // 1. Calcul Exercice N
      const payloadN = { isBalance: true, rows: parsedN };
      const bilanN   = calculateBilanFonctionnel(payloadN);
      const sigN     = calculateSIG(payloadN);
      const ratiosN  = calculateRatios(bilanN, sigN, parsedN);

      // 2. Calcul Exercice N-1 (si fourni)
      let dataN1 = null;
      if (parsedN1) {
        const payloadN1 = { isBalance: true, rows: parsedN1 };
        const bilanN1   = calculateBilanFonctionnel(payloadN1);
        const sigN1     = calculateSIG(payloadN1);
        const ratiosN1  = calculateRatios(bilanN1, sigN1, parsedN1);
        dataN1 = { bilan: bilanN1, sig: sigN1, ratios: ratiosN1, rows: parsedN1 };
      }

      const fullPayload = {
        bilan: bilanN,
        sig: sigN,
        ratios: ratiosN,
        rows: parsedN,
        profil,
        dataN1,
      };

      saveDossierToStorage(fullPayload);
      onDataImported(fullPayload);
    }, 200);
  };

  const selectedSecteurObj = SECTEURS.find(s => s.id === profil.secteurId) || SECTEURS[0];

  return (
    <div className="animate-fade-in space-y-6" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header Simplifié */}
      <div style={{ background: '#ffffff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Importation &amp; Configuration en 1 Étape</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>Saisissez les informations de l'entreprise et déposez vos balances comptables SCF.</p>
        </div>
        <div style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 14px', borderRadius: 20, fontSize: '0.74rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} /> Activités de Production par Défaut
        </div>
      </div>

      {/* Grid Principal : Profil à gauche, Import à droite */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        
        {/* ── COLONNE GAUCHE : PROFIL & SECTEUR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Dossiers Sauvegardés */}
          {savedDossiers.length > 0 && (
            <div className="card" style={{ padding: 18, border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px 0' }}>
                <FolderOpen size={16} className="text-blue-600" />
                Dossiers Enregistrés ({savedDossiers.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedDossiers.slice(0, 3).map(d => (
                  <div
                    key={d.id}
                    onClick={() => loadSavedDossier(d)}
                    style={{
                      background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nom}</div>
                      <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Modifié le {d.date}</div>
                    </div>
                    <button
                      onClick={(e) => deleteDossierFromStorage(d.id, e)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulaire Profil */}
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#2563eb' }}>business</span>
              Identité de l'Entreprise
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6 }}>Nom de l'Entreprise / Code Dossier</label>
              <input
                type="text"
                value={profil.nomEntreprise}
                onChange={e => handleProfilChange('nomEntreprise', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6 }}>Effectif (Optionnel)</label>
              <input
                type="number"
                placeholder="Ex: 45"
                value={profil.effectif}
                onChange={e => handleProfilChange('effectif', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6 }}>Secteur d'Activité (Benchmarks SCF)</label>
              <select
                value={profil.secteurId}
                onChange={e => handleProfilChange('secteurId', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
              >
                {SECTEURS.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.label}</option>
                ))}
              </select>
            </div>

            {/* Récapitulatif Fiscal du Secteur */}
            <div style={{ background: `${selectedSecteurObj.couleur}08`, border: `1px solid ${selectedSecteurObj.couleur}30`, borderRadius: 10, padding: 12, fontSize: '0.72rem' }}>
              <div style={{ fontWeight: 800, color: selectedSecteurObj.couleur, marginBottom: 4 }}>Paramètres {selectedSecteurObj.label} :</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, color: 'var(--text-sub)' }}>
                <span>• IBS standard applicable : <strong>{selectedSecteurObj.tauxIBS}</strong></span>
                <span>• TVA standard applicable : <strong>{selectedSecteurObj.tvaStandard}</strong></span>
                <span>• Taux de rotation de stock cible : <strong>{selectedSecteurObj.benchmarks.rotationStocks.norme}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLONNE DROITE : CHARGEMENT ET VALIDATION DES BALANCES ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Jeux de démonstration rapide */}
          <div style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%)', border: '1px solid #bfdbfe', borderRadius: 16, padding: 16 }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 10px 0' }}>
              <Sparkles size={15} />
              Chargement Rapide (Démos &amp; Exemples réels)
            </h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SAMPLE_BALANCES.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'stretch', borderRadius: 8, border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <button
                    onClick={() => handleLoadSample(s)}
                    title="Charger dans l'aperçu (vérifier avant de lancer)"
                    style={{
                      padding: '6px 12px', border: 'none', background: '#ffffff',
                      fontSize: '0.70rem', fontWeight: 800, color: '#1e40af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.badgeColor }}></span>
                    {s.badge}
                  </button>
                  <button
                    onClick={() => handleQuickLaunchSample(s)}
                    title="Lancer directement l'analyse (sans aperçu)"
                    style={{
                      padding: '6px 8px', border: 'none', borderLeft: '1px solid #e2e8f0', background: '#f8fafc',
                      color: '#1e40af', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <Play size={12} fill="currentColor" />
                  </button>
                  <button
                    onClick={() => downloadSampleExcel(s.id)}
                    title="Télécharger cet exemple au format Excel"
                    style={{
                      padding: '6px 8px', border: 'none', borderLeft: '1px solid #e2e8f0', background: '#f8fafc',
                      color: '#1e40af', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <Download size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Zones d'importation side-by-side ou empilées */}
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#059669' }}>upload_file</span>
              Balances Comptables SCF
            </h3>

            {/* BALANCE N (PRINCIPALE) */}
            <div style={{
              border: `2px dashed ${fileN ? '#059669' : '#2563eb'}`,
              background: fileN ? '#f0fdf4' : '#eff6ff',
              borderRadius: 12, padding: 18, textAlign: 'center', cursor: 'pointer', position: 'relative'
            }} onClick={() => !fileN && document.getElementById('unified-upload-n').click()}>
              <input
                type="file"
                id="unified-upload-n"
                style={{ display: 'none' }}
                accept=".csv, .xlsx, .xls"
                onChange={(e) => e.target.files?.[0] && handleFileN(e.target.files[0])}
              />
              
              {fileN ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <File size={22} className="text-emerald-600" />
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0f172a' }} className="truncate">{fileN.name}</div>
                      <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>
                        {parsedN ? `✅ ${parsedN.length} lignes valides` : 'Traitement...'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {parsedN && (
                      <button onClick={(e) => { e.stopPropagation(); setPreviewTarget('N'); }} style={{ padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700 }}>👁 Voir</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setFileN(null); setParsedN(null); setErrorN(null); }} style={{ padding: '4px 8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.65rem', color: '#dc2626', fontWeight: 700 }}>✕</button>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={22} style={{ margin: '0 auto 6px', color: '#2563eb' }} />
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b' }}>Balance Exercice N (Obligatoire)</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Glissez-déposez ou cliquez pour parcourir (.xlsx, .csv)</div>
                </div>
              )}
            </div>
            {errorN && <div style={{ fontSize: '0.7rem', color: '#b91c1c', background: '#fee2e2', padding: '6px 10px', borderRadius: 6 }}>{errorN}</div>}

            {/* BALANCE N-1 (OPTIONNELLE) */}
            <div style={{
              border: `2px dashed ${fileN1 ? '#059669' : '#cbd5e1'}`,
              background: fileN1 ? '#f0fdf4' : '#f8fafc',
              borderRadius: 12, padding: 18, textAlign: 'center', cursor: 'pointer'
            }} onClick={() => !fileN1 && document.getElementById('unified-upload-n1').click()}>
              <input
                type="file"
                id="unified-upload-n1"
                style={{ display: 'none' }}
                accept=".csv, .xlsx, .xls"
                onChange={(e) => e.target.files?.[0] && handleFileN1(e.target.files[0])}
              />
              
              {fileN1 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <File size={22} className="text-emerald-600" />
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0f172a' }} className="truncate">{fileN1.name}</div>
                      <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>
                        {parsedN1 ? `✅ ${parsedN1.length} lignes valides` : 'Traitement...'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {parsedN1 && (
                      <button onClick={(e) => { e.stopPropagation(); setPreviewTarget('N-1'); }} style={{ padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700 }}>👁 Voir</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setFileN1(null); setParsedN1(null); setErrorN1(null); }} style={{ padding: '4px 8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.65rem', color: '#dc2626', fontWeight: 700 }}>✕</button>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={22} style={{ margin: '0 auto 6px', color: '#94a3b8' }} />
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569' }}>Balance Exercice N-1 (Optionnel)</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Permet de débloquer le comparatif d'évolution et l'historique</div>
                </div>
              )}
            </div>
            {errorN1 && <div style={{ fontSize: '0.7rem', color: '#b91c1c', background: '#fee2e2', padding: '6px 10px', borderRadius: 6 }}>{errorN1}</div>}

            {/* Bouton de Validation unique très visible */}
            <button
              disabled={!parsedN}
              onClick={finishAndLaunch}
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                background: parsedN ? 'linear-gradient(135deg, #059669, #047857)' : '#e2e8f0',
                color: parsedN ? '#ffffff' : '#94a3b8', fontWeight: 800, fontSize: '0.9rem',
                cursor: parsedN ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: parsedN ? '0 4px 12px rgba(5,150,105,0.2)' : 'none', transition: 'all 0.2s'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>rocket_launch</span>
              Lancer l'Analyse Financière
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE CONTRÔLE COMPTABLE */}
      {previewTarget && (previewTarget === 'N' ? parsedN : parsedN1) && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)', zIndex: 99999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: '#1e40af', fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>Contrôle &amp; Prévisualisation — Balance {previewTarget}</h3>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Cochez les lignes à ignorer lors du traitement comptable (ex: sous-totaux).</span>
            </div>
            <button onClick={() => setPreviewTarget(null)} style={{ padding: '6px 16px', borderRadius: 8, cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', fontSize: '0.8rem', fontWeight: 700 }}>Fermer</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 1 }}>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Ignorer', 'Compte', 'Libellé', 'S. Début D', 'S. Début C', 'Mouv. Débit', 'Mouv. Crédit', 'S. Fin Débit', 'S. Fin Crédit'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', textAlign: i > 2 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(previewTarget === 'N' ? parsedN : parsedN1).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: row.ignore ? '#fff1f2' : '#ffffff' }}>
                    <td style={{ padding: '6px 12px', textAlign: 'center' }}><input type="checkbox" checked={row.ignore} onChange={() => toggleIgnoreRow(previewTarget, i)} /></td>
                    <td style={{ padding: '6px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{row.compte}</td>
                    <td style={{ padding: '6px 12px' }}>{row.libelle}</td>
                    {[row.soldeDebutDebit, row.soldeDebutCredit, row.mouvementDebit, row.mouvementCredit, row.soldeFinDebit, row.soldeFinCredit].map((v, j) => (
                      <td key={j} style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{v ? Math.round(v).toLocaleString('fr-FR') : ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
