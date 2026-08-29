import { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, Tooltip, 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend 
} from 'recharts';
import { getSecteur } from '../utils/secteurs';
import { calculateAltmanZScore } from '../utils/solvabiliteEngine';

export function PresentationView({ data, onClose, formatCurrency }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const fmt = formatCurrency || ((v) => (v || 0).toLocaleString('fr-FR') + ' DZD');
  const fmtPct = (v) => `${(v >= 0 ? '+' : '')}${(v * 100).toFixed(1)} %`;

  const { bilan = {}, sig = {}, ratios = {}, rows = [], profil = {} } = data || {};
  const secteur = getSecteur(profil.secteurId || data?.profil?.secteurId);
  const bm = secteur.benchmarks;
  const solv = calculateAltmanZScore(bilan, sig, rows);

  const totalSlides = 4;

  // Keyboard navigation for presentation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        setCurrentSlide(s => (s + 1) % totalSlides);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlide(s => (s - 1 + totalSlides) % totalSlides);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSlides, onClose]);

  // Radar chart data normalized (0 to 100)
  const radarData = [
    {
      subject: 'Marge EBE',
      Entreprise: Math.min(100, Math.max(0, (((sig.ebe || 0) / (sig.chiffreAffaires || 1)) / (bm.margeEBE.bon * 1.5)) * 100)),
      Secteur: Math.min(100, (bm.margeEBE.bon / (bm.margeEBE.bon * 1.5)) * 100),
      rawEntreprise: `${(((sig.ebe || 0) / (sig.chiffreAffaires || 1)) * 100).toFixed(1)}%`,
      rawSecteur: bm.margeEBE.norme
    },
    {
      subject: 'Marge Nette',
      Entreprise: Math.min(100, Math.max(0, (((sig.resultatNet || 0) / (sig.chiffreAffaires || 1)) / (bm.margeNette.bon * 1.5)) * 100)),
      Secteur: Math.min(100, (bm.margeNette.bon / (bm.margeNette.bon * 1.5)) * 100),
      rawEntreprise: `${(((sig.resultatNet || 0) / (sig.chiffreAffaires || 1)) * 100).toFixed(1)}%`,
      rawSecteur: bm.margeNette.norme
    },
    {
      subject: 'Taux VA',
      Entreprise: Math.min(100, Math.max(0, (((sig.valeurAjoutee || 0) / (sig.chiffreAffaires || 1)) / (bm.tauxVA.bon * 1.5)) * 100)),
      Secteur: Math.min(100, (bm.tauxVA.bon / (bm.tauxVA.bon * 1.5)) * 100),
      rawEntreprise: `${(((sig.valeurAjoutee || 0) / (sig.chiffreAffaires || 1)) * 100).toFixed(1)}%`,
      rawSecteur: bm.tauxVA.norme
    },
    {
      subject: 'Liquidité Gén.',
      Entreprise: Math.min(100, Math.max(0, ((ratios.liquiditeGenerale || 0) / 2.0) * 100)),
      Secteur: Math.min(100, (bm.liquiditeGenerale.bon / 2.0) * 100),
      rawEntreprise: (ratios.liquiditeGenerale || 0).toFixed(2),
      rawSecteur: bm.liquiditeGenerale.norme
    },
    {
      subject: 'Autonomie Fin.',
      Entreprise: Math.min(100, Math.max(0, ((ratios.autonomieFinanciere || 0) / 0.6) * 100)),
      Secteur: Math.min(100, (bm.autonomieFinanciere.bon / 0.6) * 100),
      rawEntreprise: `${(((ratios.autonomieFinanciere || 0)) * 100).toFixed(1)}%`,
      rawSecteur: bm.autonomieFinanciere.norme
    },
    {
      subject: 'Maîtrise BFR',
      Entreprise: Math.max(0, Math.min(100, 100 - (((ratios.bfrJoursCA || 0) / (bm.bfrJoursCA.limite * 1.5)) * 100))),
      Secteur: Math.max(0, Math.min(100, 100 - ((bm.bfrJoursCA.bon / (bm.bfrJoursCA.limite * 1.5)) * 100))),
      rawEntreprise: `${Math.round(ratios.bfrJoursCA || 0)} j`,
      rawSecteur: bm.bfrJoursCA.norme
    },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      background: 'linear-gradient(135deg, #0b0f19 0%, #111827 50%, #030712 100%)',
      color: '#ffffff', display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif', userSelect: 'none'
    }}>

      {/* Top Presentation Bar */}
      <header style={{
        padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(17, 24, 39, 0.7)', backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ padding: '6px 12px', borderRadius: 8, background: 'linear-gradient(135deg, #1b6e8c, #7c3aed)', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.08em' }}>
            BAIQ DAF EXECUTIVE
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
              {profil.nomEntreprise || 'Entité Anonyme'} — Synthèse Direction Financière
            </div>
            <div style={{ fontSize: '0.74rem', color: '#9ca3af' }}>
              Référentiel SCF Algérie · Secteur : {secteur.label}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                style={{
                  width: idx === currentSlide ? 28 : 10, height: 10, borderRadius: 4,
                  background: idx === currentSlide ? '#2e96b3' : 'rgba(255,255,255,0.2)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                title={`Aller au Slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239,68,68,0.4)',
              color: '#fca5a5', padding: '6px 14px', borderRadius: 8,
              fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            Quitter (ESC)
          </button>
        </div>
      </header>

      {/* Main Slide Content Area */}
      <main style={{ flex: 1, padding: '32px 48px', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        
        {/* ── SLIDE 1 : ÉQUILIBRE FINANCIER & BILAN FONCTIONNEL ── */}
        {currentSlide === 0 && (
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#4fb3cc', textTransform: 'uppercase', letterSpacing: '0.08em' }}>SLIDE 1 / 4 · STRUCTURE FINANCIÈRE</span>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', margin: '4px 0 0' }}>Équilibre du Bilan &amp; Position de Trésorerie</h1>
              </div>
              <div style={{ padding: '8px 16px', borderRadius: 12, background: (bilan.tn || 0) >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${(bilan.tn || 0) >= 0 ? '#10b981' : '#ef4444'}`, color: (bilan.tn || 0) >= 0 ? '#34d399' : '#f87171', fontWeight: 800, fontSize: '0.92rem' }}>
                {(bilan.tn || 0) >= 0 ? '✓ Position de Liquidité Saine' : '⚠ Tension sur la Trésorerie'}
              </div>
            </div>

            {/* 3 Cartes Majeures */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
                <span style={{ fontSize: '0.80rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Fonds de Roulement (FRNG)</span>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4fb3cc', margin: '8px 0' }}>{fmt(bilan.frng)}</div>
                <div style={{ fontSize: '0.80rem', color: (bilan.frng || 0) >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                  {(bilan.frng || 0) >= 0 ? 'Ressources stables excédentaires' : 'Emplois stables sous-financés'}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
                <span style={{ fontSize: '0.80rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Besoin en Fonds de Roulement (BFR)</span>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', margin: '8px 0' }}>{fmt(bilan.bfr)}</div>
                <div style={{ fontSize: '0.80rem', color: '#9ca3af', fontWeight: 700 }}>
                  Équivalent à {Math.round(ratios.bfrJoursCA || 0)} jours de Chiffre d'Affaires
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
                <span style={{ fontSize: '0.80rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Trésorerie Nette (TN)</span>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: (bilan.tn || 0) >= 0 ? '#34d399' : '#f87171', margin: '8px 0' }}>{fmt(bilan.tn)}</div>
                <div style={{ fontSize: '0.80rem', color: '#9ca3af', fontWeight: 700 }}>
                  FRNG − BFR = Disponibilités Net de Concours
                </div>
              </div>
            </div>

            {/* Masses Fonctionnelles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 16, padding: 20 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', color: '#8fc6d6' }}>EMPLOIS DU BILAN (ACTIF)</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#d1d5db' }}>Emplois Stables (Actifs Non Courants)</span>
                  <span style={{ fontWeight: 800 }}>{fmt(bilan.emploisStables)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#d1d5db' }}>Actif Circulant (Stocks + Créances)</span>
                  <span style={{ fontWeight: 800 }}>{fmt(bilan.actifCirculant)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: '#d1d5db' }}>Trésorerie Active (Disponibilités)</span>
                  <span style={{ fontWeight: 800 }}>{fmt(bilan.tresorerieActive)}</span>
                </div>
              </div>

              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: 20 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', color: '#6ee7b7' }}>RESSOURCES DU BILAN (PASSIF)</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#d1d5db' }}>Ressources Stables (Capitaux Propres + DLT)</span>
                  <span style={{ fontWeight: 800 }}>{fmt(bilan.ressourcesStables)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#d1d5db' }}>Passif Circulant (Fournisseurs + Fiscal)</span>
                  <span style={{ fontWeight: 800 }}>{fmt(bilan.passifCirculant)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: '#d1d5db' }}>Trésorerie Passive (Concours Bancaires)</span>
                  <span style={{ fontWeight: 800 }}>{fmt(bilan.tresoreriePassive)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SLIDE 2 : PERFORMANCE ÉCONOMIQUE & TCR ── */}
        {currentSlide === 1 && (
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>SLIDE 2 / 4 · PERFORMANCE ÉCONOMIQUE</span>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', margin: '4px 0 0' }}>Compte de Résultat &amp; Cascade des Marges</h1>
              </div>
              <div style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(124,58,237,0.15)', border: '1px solid #8b5cf6', color: '#c4b5fd', fontWeight: 800, fontSize: '0.92rem' }}>
                Marge Nette : {fmtPct((sig.resultatNet || 0) / (sig.chiffreAffaires || 1))}
              </div>
            </div>

            {/* 4 Paliers de Rentabilité */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 }}>
                <span style={{ fontSize: '0.74rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Chiffre d'Affaires (CA)</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4fb3cc', margin: '6px 0' }}>{fmt(sig.chiffreAffaires)}</div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>100.0 % de l'activité</span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 }}>
                <span style={{ fontSize: '0.74rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Valeur Ajoutée (VA)</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#818cf8', margin: '6px 0' }}>{fmt(sig.valeurAjoutee)}</div>
                <span style={{ fontSize: '0.74rem', color: '#a5b4fc', fontWeight: 700 }}>Taux VA : {fmtPct((sig.valeurAjoutee || 0) / (sig.chiffreAffaires || 1))}</span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 }}>
                <span style={{ fontSize: '0.74rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Excédent Brut (EBE)</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399', margin: '6px 0' }}>{fmt(sig.ebe)}</div>
                <span style={{ fontSize: '0.74rem', color: '#6ee7b7', fontWeight: 700 }}>Marge EBE : {fmtPct((sig.ebe || 0) / (sig.chiffreAffaires || 1))}</span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 }}>
                <span style={{ fontSize: '0.74rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Résultat Net (RN)</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: (sig.resultatNet || 0) >= 0 ? '#34d399' : '#f87171', margin: '6px 0' }}>{fmt(sig.resultatNet)}</div>
                <span style={{ fontSize: '0.74rem', color: (sig.resultatNet || 0) >= 0 ? '#86efac' : '#fca5a5', fontWeight: 700 }}>Solde final distribuable</span>
              </div>
            </div>

            {/* Répartition de la Valeur Ajoutée */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '0.92rem', color: '#e2e8f0' }}>PARTAGE DE LA VALEUR AJOUTÉE (RÉPARTITION SCF)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#9ca3af' }}>Personnel (Salaires 63)</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b', marginTop: 3 }}>{fmt(sig.chargesPersonnel)}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{fmtPct((sig.chargesPersonnel || 0) / (sig.valeurAjoutee || 1))} de la VA</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#9ca3af' }}>État &amp; Collectivités (64 + 69)</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#c084fc', marginTop: 3 }}>{fmt((sig.impotsTaxes || 0) + (sig.impotsSurResultats || 0))}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Taxes &amp; IBS</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#9ca3af' }}>Prêteurs (Frais Fin. 66)</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f87171', marginTop: 3 }}>{fmt(sig.chargesFinancieres)}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Charges financières</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#9ca3af' }}>Autofinancement &amp; Amort.</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', marginTop: 3 }}>{fmt(sig.dotationsAmortissements)}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Dépréciation du capital</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SLIDE 3 : RADAR BENCHMARK SECTORIEL & DÉLAIS ── */}
        {currentSlide === 2 && (
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>SLIDE 3 / 4 · COMPÉTITIVITÉ SECTORIELLE</span>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', margin: '4px 0 0' }}>Radar Sectoriel &amp; Délais d'Exploitation</h1>
              </div>
              <div style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(59,130,246,0.15)', border: '1px solid #2e96b3', color: '#8fc6d6', fontWeight: 800, fontSize: '0.85rem' }}>
                Benchmark : {secteur.label}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28, alignItems: 'center' }}>
              {/* Radar Chart Recharts */}
              <div style={{ height: 320, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.15)" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                    <Radar name="Votre Entreprise" dataKey="Entreprise" stroke="#2e96b3" fill="#2e96b3" fillOpacity={0.45} />
                    <Radar name="Moyenne Secteur Algérie" dataKey="Secteur" stroke="#a855f7" fill="#a855f7" fillOpacity={0.25} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Tableau des Délais Clés */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: '#9ca3af', fontWeight: 700 }}>Créances Clients (DSO)</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: (ratios.delaiRecouvrement || 0) <= bm.dso.bon ? '#34d399' : '#f87171', marginTop: 2 }}>
                      {Math.round(ratios.delaiRecouvrement || 0)} jours
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.70rem', color: '#64748b' }}>Norme Secteur</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#c084fc' }}>{bm.dso.norme}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: '#9ca3af', fontWeight: 700 }}>Dettes Fournisseurs (DPO)</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4fb3cc', marginTop: 2 }}>
                      {Math.round(ratios.delaiFournisseurs || 0)} jours
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.70rem', color: '#64748b' }}>Norme Secteur</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#c084fc' }}>{bm.dpo.norme}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: '#9ca3af', fontWeight: 700 }}>Rotation des Stocks (DIO)</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: (ratios.rotationStocks || 0) <= bm.rotationStocks.bon ? '#34d399' : '#f59e0b', marginTop: 2 }}>
                      {Math.round(ratios.rotationStocks || 0)} jours
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.70rem', color: '#64748b' }}>Norme Secteur</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#c084fc' }}>{bm.rotationStocks.norme}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SLIDE 4 : RATING RISQUE CRÉDIT & CAPACITÉ D'EMPRUNT ── */}
        {currentSlide === 3 && (
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>SLIDE 4 / 4 · ACCÈS AU FINANCEMENT</span>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', margin: '4px 0 0' }}>Rating de Crédit &amp; Capacité d'Emprunt</h1>
              </div>
              <div style={{ padding: '8px 20px', borderRadius: 12, background: solv.zoneBg, border: `1px solid ${solv.zoneBorder}`, color: solv.zoneColor, fontWeight: 900, fontSize: '1.15rem' }}>
                Note : {solv.rating} ({solv.zoneLabel.split('—')[0].trim()})
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
                <span style={{ fontSize: '0.80rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Score Altman Z'' (EM-Score)</span>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: solv.zoneColor, margin: '8px 0' }}>{solv.zScore.toFixed(2)}</div>
                <div style={{ fontSize: '0.80rem', color: '#9ca3af' }}>Niveau de risque (zone Altman Z'') : <strong style={{ color: '#fff' }}>{solv.risqueDefaillance}</strong></div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
                <span style={{ fontSize: '0.80rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Score Banque d'Algérie</span>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: solv.bancaire.ratingBAColor, margin: '8px 0' }}>
                  {solv.bancaire.scoreBA} <span style={{ fontSize: '1.15rem', color: '#64748b' }}>/ 20</span>
                </div>
                <div style={{ fontSize: '0.80rem', color: '#9ca3af' }}>Avis d'octroi de crédit : <strong style={{ color: solv.bancaire.ratingBAColor }}>{solv.bancaire.statutCredit}</strong></div>
              </div>

              <div style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 16, padding: 24 }}>
                <span style={{ fontSize: '0.80rem', color: '#8fc6d6', fontWeight: 800, textTransform: 'uppercase' }}>Capacité d'Emprunt Max (DZD)</span>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4fb3cc', margin: '8px 0' }}>{fmt(solv.bancaire.capaciteEndettementMax)}</div>
                <div style={{ fontSize: '0.74rem', color: '#b7dce6' }}>{'Plafond prudentiel bancaire (3.5 × EBE)'}</div>
              </div>
            </div>

            {/* Diagnostic DAF Conclusif */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: '#4fb3cc' }}>fact_check</span>
                SYNTHÈSE STRATÉGIQUE POUR LE COMITÉ DE DIRECTION
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                L'entité présente une structure de bilan avec un FRNG de <strong>{fmt(bilan.frng)}</strong> et une trésorerie nette de <strong>{fmt(bilan.tn)}</strong>.
                La marge brute d'exploitation (EBE) s'établit à <strong>{fmt(sig.ebe)}</strong> ({fmtPct((sig.ebe || 0) / (sig.chiffreAffaires || 1))}), offrant un ratio de couverture des dettes de <strong>{solv.bancaire.ratioDetteSurEBE.toFixed(1)} an(s)</strong>.
                L'entreprise est classée en statut <strong>{solv.bancaire.statutCredit}</strong> pour toute demande de concours financier ou d'investissement.
              </p>
              {solv.estimationPartielle && (
                <p style={{ margin: '10px 0 0', fontSize: '0.72rem', color: '#fbbf24', lineHeight: 1.5 }}>
                  ⚠️ {solv.estimationPartielleMessage}
                </p>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Bottom Controls Bar */}
      <footer style={{
        padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(17, 24, 39, 0.8)', backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.74rem', color: '#9ca3af' }}>
          <span>Utilisez les touches <strong style={{ color: '#fff' }}>← / →</strong> ou la barre <strong style={{ color: '#fff' }}>Espace</strong> pour changer de slide</span>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setCurrentSlide(s => (s - 1 + totalSlides) % totalSlides)}
            disabled={currentSlide === 0}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
              background: currentSlide === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
              color: currentSlide === 0 ? '#4b5563' : '#fff', cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 800, fontSize: '0.80rem'
            }}
          >
            ← Précédent
          </button>

          <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#fff' }}>
            {currentSlide + 1} / {totalSlides}
          </span>

          <button
            onClick={() => setCurrentSlide(s => (s + 1) % totalSlides)}
            disabled={currentSlide === totalSlides - 1}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
              background: currentSlide === totalSlides - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(37,99,235,0.8)',
              color: currentSlide === totalSlides - 1 ? '#4b5563' : '#fff', cursor: currentSlide === totalSlides - 1 ? 'not-allowed' : 'pointer',
              fontWeight: 800, fontSize: '0.80rem'
            }}
          >
            Suivant →
          </button>
        </div>
      </footer>
    </div>
  );
}
