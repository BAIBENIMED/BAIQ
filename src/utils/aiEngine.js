/* ═══════════════════════════════════════════════════════════════════════
   BAIQ — Moteur d'Analyse IA & Diagnostic Financier Approfondi
   Diagnostic multidimensionnel de haute précision (SCF Algérie — Loi 07-11)
   Analyse structurelle, rentabilité, partage de la VA, CAF, effet de levier,
   solvabilité Banque d'Algérie, Altman Z'' et plan d'action stratégique chiffré.
   ═══════════════════════════════════════════════════════════════════════ */

import { getSecteur, scorerIndicateur } from './secteurs';
import { calculateAltmanZScore } from './solvabiliteEngine';

const safe = (a, b) => (b && b !== 0 && isFinite(a / b) ? a / b : 0);
const pct  = (v, d = 1) => `${(v * 100).toFixed(d)} %`;
const days = (v) => `${Math.round(v || 0)} jours`;
const fmtDZD = (v) => (v || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' DZD';

/* ─── Moteur d'Analyse Approfondie ─────────────────────────── */
export function runAIAnalysis(data) {
  if (!data) return null;

  const { bilan: b = {}, sig: s = {}, ratios: r = {}, rows = [], profil = {}, dataN1 = null } = data;
  const secteur = getSecteur(profil.secteurId);
  const bm = secteur.benchmarks;
  const solv = calculateAltmanZScore(b, s, rows);

  // ── 1. Métriques de Base & Flux du TCR ──
  const ca       = s.chiffreAffaires || 0;
  const va       = s.valeurAjoutee   || 0;
  const ebe      = s.ebe             || 0;
  const reop     = s.resultatExploitation || 0;
  const rnet     = s.resultatNet     || 0;
  const cpers    = s.chargesPersonnel || 0;
  const cimp     = s.impotsTaxes || 0;
  const dotam    = s.dotationsExploitation || s.c68_expl || s.dotationsAmortissements || 0;
  const cchfin   = s.chargesFinancieres || 0;
  const impots   = s.impotsBenefices || s.impotsSurResultats || 0;
  const achats   = s.achatsConsommes || s.achats || s.consommationExercice || 0;

  // ── 2. Marges & Ratios de Performance Économique ──
  const margeEBE        = safe(ebe, ca);
  const margeOper       = safe(reop, ca);
  const margeNette      = safe(rnet, ca);
  const tauxVA          = safe(va, ca);
  const productivite    = safe(va, cpers);
  const poidsPersonnel  = safe(cpers, va);
  const couvertureFin   = cchfin > 0 ? safe(ebe, cchfin) : 99;

  // ── 3. Capacité d'Autofinancement (CAF) ──
  // Méthode soustractive SCF : EBE - Charges financières décaissables - IBS
  const caf = Math.max(0, ebe - cchfin - impots);
  const tauxCAF = safe(caf, ca);
  
  // Dettes financières et capacité de remboursement
  const dettesFinancieres = solv.bancaire?.dettesFinancieresLT || 0;
  const ratioDetteSurCAF = caf > 0 ? safe(dettesFinancieres, caf) : (dettesFinancieres > 0 ? 99 : 0);
  const capaciteRemboursementLabel =
    ratioDetteSurCAF <= 2.0 ? 'Excellente (≤ 2 ans)' :
    ratioDetteSurCAF <= 3.5 ? 'Normale (2 à 3.5 ans)' :
    ratioDetteSurCAF <= 5.0 ? 'Tendue (3.5 à 5 ans)' : 'Critique (> 5 ans)';

  // ── 4. Partage & Répartition de la Valeur Ajoutée (SCF) ──
  const partPersonnel    = safe(cpers, va);            // Facteur travail (Compte 63)
  const partEtat         = safe(cimp + impots, va);    // Impôts & Taxes (64 + 695)
  const partPreteurs     = safe(cchfin, va);           // Charges financières (66)
  const partEntreprise   = safe(caf, va);              // Autofinancement & renouvellement
  const partActionnaires = safe(rnet, va);             // Rémunération des capitaux propres

  // ── 5. Rentabilité des Capitaux & Effet de Levier Financier ──
  const capitauxPropres = solv.bancaire?.capitauxPropres || (b.ressourcesStables ? b.ressourcesStables * 0.6 : 1);
  const actifTotal = (b.emploisStables || 0) + (b.actifCirculant || 0) + (b.tresorerieActive || 0) || 1;
  const roe = safe(rnet, capitauxPropres); // Return on Equity (Rentabilité Financière)
  const roa = safe(reop, actifTotal);     // Return on Assets (Rentabilité Économique)
  const effetLevier = roe - roa;          // Effet de levier financier

  // ── 6. Équilibre Fonctionnel & Trésorerie ──
  const liq    = r.liquiditeGenerale    || 0;
  const autFin = r.autonomieFinanciere  || 0;
  const dso    = r.delaiRecouvrement    || 0;
  const dpo    = r.delaiFournisseurs    || 0;
  const rotS   = r.rotationStocks       || 0;
  const bfrJCA = r.bfrJoursCA           || 0;
  const frng   = b.frng || 0;
  const bfr    = b.bfr  || 0;
  const tn     = b.tn   || 0;

  // ── 7. Détection du Cash Potentiel Bloqué dans le BFR ──
  const gainDSO = Math.max(0, (dso - bm.dso.bon) * (ca / 360));
  const gainStock = Math.max(0, (rotS - bm.rotationStocks.bon) * (achats / 360));
  const gainDPO = Math.max(0, (bm.dpo.bon - dpo) * (achats / 360));
  const totalCashLibérable = gainDSO + gainStock + (dpo < bm.dpo.min ? gainDPO : 0);

  // ── 8. Profil & Ratios Salariés ──
  const effectif = Number(profil.effectif) || 0;
  const caParSalarie = effectif > 0 ? safe(ca, effectif) : null;
  const vaParSalarie = effectif > 0 ? safe(va, effectif) : null;

  // ── 9. Comparatif N-1 ──
  let evolutions = null;
  if (dataN1) {
    const caN1   = dataN1.sig?.chiffreAffaires || 0;
    const rnetN1 = dataN1.sig?.resultatNet || 0;
    const ebeN1  = dataN1.sig?.ebe || 0;
    const frngN1 = dataN1.bilan?.frng || 0;
    const bfrN1  = dataN1.bilan?.bfr || 0;
    const tnN1   = dataN1.bilan?.tn || 0;

    evolutions = {
      caGrowth: caN1 > 0 ? (ca - caN1) / caN1 : null,
      rnetGrowth: rnetN1 !== 0 ? (rnet - rnetN1) / Math.abs(rnetN1) : null,
      ebeGrowth: ebeN1 !== 0 ? (ebe - ebeN1) / Math.abs(ebeN1) : null,
      frngDelta: frng - frngN1,
      bfrDelta: bfr - bfrN1,
      tnDelta: tn - tnN1,
    };
  }

  // ── 10. Audit de Conformité SCF Rapide ──
  let anomaliesComptablesCount = 0;
  let caisseCreditrice = false;
  let comptesAttenteBloques = 0;

  if (rows && rows.length > 0) {
    rows.forEach(r => {
      if (!r || !r.compte || r.ignore) return;
      const c = r.compte.toString().trim();
      const p3 = c.slice(0, 3);
      const p2 = c.slice(0, 2);
      const sd = Math.abs(r.soldeFinDebit || 0);
      const sc = Math.abs(r.soldeFinCredit || 0);

      if (['531','532','533','534'].includes(p3) && sc > 0.01) {
        anomaliesComptablesCount++;
        caisseCreditrice = true;
      }
      if (p2 === '47' && (sd + sc) > 0.01) {
        anomaliesComptablesCount++;
        comptesAttenteBloques += (sd + sc);
      }
      if (p2 === '40' && !['406','409'].includes(p3) && sd > 0.01) anomaliesComptablesCount++;
      if (p2 === '41' && p3 !== '419' && sc > 0.01) anomaliesComptablesCount++;
    });
  }

  // ── 11. Scoring Sectoriel par Catégorie (0-100) ──
  const scoreRentabilite = Math.max(0, Math.min(100,
    scorerIndicateur(margeNette, bm.margeNette) * 0.35 +
    scorerIndicateur(margeEBE, bm.margeEBE) * 0.35 +
    scorerIndicateur(margeOper, bm.margeEBE) * 0.30
  ));

  const scoreLiquidite = Math.max(0, Math.min(100,
    scorerIndicateur(liq, bm.liquiditeGenerale) * 0.45 +
    (tn >= 0 ? 85 : 20) * 0.35 +
    (frng >= 0 ? 85 : 20) * 0.20
  ));

  const scoreStructure = Math.max(0, Math.min(100,
    scorerIndicateur(autFin, bm.autonomieFinanciere) * 0.50 +
    scorerIndicateur(couvertureFin, bm.couvertureFin) * 0.30 +
    (ratioDetteSurCAF <= 3.5 ? 85 : 25) * 0.20
  ));

  const scoreActivite = Math.max(0, Math.min(100,
    scorerIndicateur(dso, bm.dso, true) * 0.30 +
    scorerIndicateur(dpo, { critique: bm.dpo.max + 30, faible: bm.dpo.max, bon: bm.dpo.bon, excellent: bm.dpo.min }, false) * 0.25 +
    (secteur.id === 'services' || rotS === 0 ? 80 : scorerIndicateur(rotS, bm.rotationStocks, true)) * 0.25 +
    scorerIndicateur(bfrJCA, bm.bfrJoursCA, true) * 0.20
  ));

  const scoreProductivite = Math.max(0, Math.min(100,
    scorerIndicateur(tauxVA, bm.tauxVA) * 0.40 +
    scorerIndicateur(productivite, bm.productivite) * 0.35 +
    (poidsPersonnel <= 0.50 ? 100 : poidsPersonnel <= 0.65 ? 75 : poidsPersonnel <= 0.80 ? 40 : 15) * 0.25
  ));

  const scores = {
    rentabilite: scoreRentabilite,
    liquidite: scoreLiquidite,
    structure: scoreStructure,
    activite: scoreActivite,
    productivite: scoreProductivite,
  };

  const scoreGlobal = Math.round(
    scores.rentabilite  * 0.28 +
    scores.liquidite    * 0.24 +
    scores.structure    * 0.20 +
    scores.activite     * 0.16 +
    scores.productivite * 0.12
  );

  const niveau =
    scoreGlobal >= 78 ? { label: 'Excellente', color: '#059669', emoji: '🟢' } :
    scoreGlobal >= 58 ? { label: 'Solide & Favorable', color: '#2563eb', emoji: '🔵' } :
    scoreGlobal >= 42 ? { label: 'Mitigée & Sous Vigilance', color: '#d97706', emoji: '🟡' } :
    scoreGlobal >= 28 ? { label: 'Vulnérable & Préoccupante', color: '#f97316', emoji: '🟠' } :
                        { label: 'Critique & Risque Majeur', color: '#dc2626', emoji: '🔴' };

  // ── 12. Forces Détaillées ──
  const forces = [];
  if (rnet > 0 && margeNette >= bm.margeNette.bon)
    forces.push({ titre: `Rentabilité nette de haut niveau (${pct(margeNette)})`, detail: `Génération d'un résultat net de ${fmtDZD(rnet)}, surpassant le benchmark sectoriel de ${bm.margeNette.norme}. Capacité avérée à transformer le CA en enrichissement des actionnaires.`, cat: 'Rentabilité', score: 95 });
  else if (rnet > 0)
    forces.push({ titre: `Activité bénéficiaire (${pct(margeNette)})`, detail: `Résultat net positif de ${fmtDZD(rnet)}. L'entreprise préserve sa rentabilité même si la marge nette reste perfectible face à la norme (${bm.margeNette.norme}).`, cat: 'Rentabilité', score: 65 });

  if (ebe > 0 && margeEBE >= bm.margeEBE.bon)
    forces.push({ titre: `Excédent Brut d'Exploitation robuste (${pct(margeEBE)} du CA)`, detail: `EBE de ${fmtDZD(ebe)}. La marge brute d'exploitation couvre largement le renouvellement de l'outil de production et les frais financiers.`, cat: 'EBE & Cash', score: 90 });

  if (frng > 0)
    forces.push({ titre: `Équilibre structurel du bilan assuré (FRNG positif)`, detail: `FRNG de ${fmtDZD(frng)}. Les ressources durables financent 100% des immobilisations et dégagent un matelas de sécurité pour l'exploitation.`, cat: 'Équilibre Fonctionnel', score: 85 });

  if (tn > 0)
    forces.push({ titre: `Trésorerie nette excédentaire (${fmtDZD(tn)})`, detail: `Position de liquidité autonome. Aucune dépendance envers les autorisations de découvert ou facilités de caisse bancaires.`, cat: 'Trésorerie', score: 82 });

  if (liq >= bm.liquiditeGenerale.bon)
    forces.push({ titre: `Ratio de liquidité générale sécurisé (${liq.toFixed(2)}x)`, detail: `L'actif circulant couvre ${liq.toFixed(2)} fois les dettes à court terme (norme sectorielle : ${bm.liquiditeGenerale.norme}).`, cat: 'Liquidité', score: 88 });

  if (autFin >= bm.autonomieFinanciere.bon)
    forces.push({ titre: `Forte autonomie financière (${pct(autFin)})`, detail: `Les capitaux propres représentent ${pct(autFin)} du passif total. Excellente indépendance vis-à-vis des bailleurs de fonds.`, cat: 'Structure & Solvabilité', score: 92 });

  if (dso > 0 && dso <= bm.dso.bon)
    forces.push({ titre: `Recouvrement clients performant (${days(dso)})`, detail: `DSO maîtrisé sous la cible de ${bm.dso.norme}. Le cycle d'encaissement évite la déperdition de trésorerie.`, cat: 'Créances Clients', score: 88 });

  if (tauxVA >= bm.tauxVA.bon)
    forces.push({ titre: `Forte création de valeur ajoutée (${pct(tauxVA)} du CA)`, detail: `VA de ${fmtDZD(va)}. L'entreprise valorise fortement ses facteurs de production internes face aux intrants consommés.`, cat: 'Valeur Ajoutée', score: 85 });

  if (ratioDetteSurCAF <= 2.5 && caf > 0)
    forces.push({ titre: `Capacité d'extinction de la dette rapide (${fmtNum(ratioDetteSurCAF)} an(s))`, detail: `La CAF générée permettrait de solder la totalité des dettes financières à long terme en moins de 2.5 ans.`, cat: 'Dette & Solvabilité', score: 89 });

  if (evolutions?.caGrowth > 0.05)
    forces.push({ titre: `Dynamique commerciale positive (+${pct(evolutions.caGrowth)} de CA)`, detail: `Croissance confirmée par rapport à l'exercice précédent. Expansion de l'activité.`, cat: 'Croissance', score: 90 });

  // ── 13. Faiblesses Détaillées ──
  const faiblesses = [];
  if (rnet <= 0)
    faiblesses.push({ titre: `Résultat net déficitaire (${fmtDZD(rnet)})`, detail: `Destruction de valeur sur l'exercice. L'entité n'a pas dégagé de profit pour rémunérer les capitaux propres ni consolider ses réserves.`, cat: 'Rentabilité', severite: 'critique' });
  else if (margeNette < bm.margeNette.faible)
    faiblesses.push({ titre: `Marge nette inférieure au standard (${pct(margeNette)})`, detail: `Marge bénéficiaire trop étroite face à la norme du secteur (${bm.margeNette.norme}). Risque de basculement en déficit à la moindre fluctuation de charges.`, cat: 'Rentabilité', severite: 'eleve' });

  if (ebe <= 0)
    faiblesses.push({ titre: "EBE déficitaire — Activité opérationnelle non rentable", detail: `L'activité industrielle/commerciale consomme plus de cash opérationnel qu'elle n'en génère. Situation d'urgence vitale.`, cat: 'EBE', severite: 'critique' });
  else if (margeEBE < bm.margeEBE.faible)
    faiblesses.push({ titre: `Marge d'EBE comprimée (${pct(margeEBE)})`, detail: `Marge d'EBE insuffisante pour absorber les amortissements et les charges d'intérêts. La marge brute d'exploitation doit être relevée.`, cat: 'EBE', severite: 'eleve' });

  if (frng < 0)
    faiblesses.push({ titre: `Déficit structurel de FRNG (${fmtDZD(frng)})`, detail: `Non-respect de la règle d'or financière : des emplois durables sont financés par de la dette à court terme. Vulnérabilité majeure.`, cat: 'Structure Financière', severite: 'critique' });

  if (tn < 0)
    faiblesses.push({ titre: `Trésorerie nette négative (${fmtDZD(tn)})`, detail: `Tension de liquidité immédiate. L'exploitation dépend des crédits de trésorerie et facilités bancaires court terme à taux élevé.`, cat: 'Trésorerie', severite: 'eleve' });

  if (liq < bm.liquiditeGenerale.critique)
    faiblesses.push({ titre: `Risque d'illiquidité court terme (${liq.toFixed(2)}x)`, detail: `L'actif réalisable et disponible ne permet pas d'honorer l'exigible à court terme. Risque de cessation de paiement technique.`, cat: 'Liquidité', severite: 'critique' });

  if (autFin < bm.autonomieFinanciere.critique)
    faiblesses.push({ titre: `Forte dépendance envers les tiers (${pct(autFin)})`, detail: `Capitaux propres trop faibles (${pct(autFin)} du bilan). Pouvoir de négociation bancaire et capacité d'emprunt réduits.`, cat: 'Structure', severite: 'critique' });

  if (dso > bm.dso.limite)
    faiblesses.push({ titre: `Délais de crédit clients excessifs (${days(dso)})`, detail: `DSO anormalement long (${days(dso)} vs norme ${bm.dso.norme}). Immobilisation injustifiée de ${fmtDZD(gainDSO)} de trésorerie.`, cat: 'Créances Clients', severite: 'eleve' });

  if (rotS > bm.rotationStocks.limite && secteur.id !== 'services')
    faiblesses.push({ titre: `Rotation des stocks lente (${days(rotS)})`, detail: `Stock moyen immobilisé pendant ${days(rotS)}. Risque de dépréciation, casse et surcoûts de stockage (${fmtDZD(gainStock)} de cash immobilisé).`, cat: 'Stocks', severite: 'eleve' });

  if (bfrJCA > bm.bfrJoursCA.limite)
    faiblesses.push({ titre: `BFR d'exploitation lourd (${days(bfrJCA)} de CA)`, detail: `Le cycle commercial réclame trop de capitaux de roulement (${fmtDZD(bfr)}).`, cat: 'BFR', severite: 'eleve' });

  if (poidsPersonnel > 0.75)
    faiblesses.push({ titre: `Poids salarial prépondérant (${pct(poidsPersonnel)} de la VA)`, detail: `Les charges de personnel absorbent plus des 3/4 de la richesse créée, réduisant l'EBE à la portion congrue.`, cat: 'Ressources Humaines', severite: 'eleve' });

  if (caisseCreditrice)
    faiblesses.push({ titre: `Anomalie majeure : Compte Caisse créditeur`, detail: `Le compte 53x présente un solde créditeur, ce qui constitue une irrégularité matérielle et fiscale stricte selon le SCF.`, cat: 'Audit SCF', severite: 'critique' });

  // ── 14. Plan d'Action Stratégique & Chiffré ──
  const recommandations = [];

  // Action 1 : Recouvrement Clients
  if (dso > bm.dso.bon) {
    recommandations.push({
      priorite: 1,
      horizon: '0 à 30 jours',
      categorie: 'Trésorerie & BFR',
      action: `Accélération du recouvrement clients (Objectif cible : ${bm.dso.bon} jours)`,
      detail: `Le délai moyen actuel de ${days(dso)} pénalise le cash. Un plan d'apurement strict permet de dégager ${fmtDZD(gainDSO)} de liquidités directes.`,
      etapes: [
        'Établir la balance âgée des comptes 411 et engager des relances échelonnées (J-5, J+0, J+15).',
        'Mettre en place un escompte de règlement anticipé (ex: 1% pour paiement à 10 jours).',
        'Exiger un acompte obligatoire de 30% à la commande pour tout nouveau contrat client.',
        'Activer le prélèvement automatique ou le virement interbancaire direct.'
      ],
      gainEstime: fmtDZD(gainDSO),
      impact: 'Trésorerie nette immédiate',
      urgence: dso > bm.dso.limite ? 'critique' : 'haute'
    });
  }

  // Action 2 : Optimisation des Stocks
  if (rotS > bm.rotationStocks.bon && secteur.id !== 'services') {
    recommandations.push({
      priorite: 2,
      horizon: '1 à 3 mois',
      categorie: 'Exploitation & Stocks',
      action: `Déstockage et rationalisation des approvisionnements (Objectif : ${bm.rotationStocks.bon} jours)`,
      detail: `Le cycle de stock de ${days(rotS)} engendre une sur-mobilisation de cash. L'ajustement du stock de sécurité libérera environ ${fmtDZD(gainStock)}.`,
      etapes: [
        'Réaliser un audit ABC/Pareto sur les comptes 30 (Marchandises) et 31 (Matières Premières).',
        'Déstocker ou provisionner les références à rotation nulle depuis plus de 180 jours.',
        'Ajuster les commandes fournisseurs en méthode de réapprovisionnement au point de commande.',
        'Mettre en place des livraisons fractionnées avec les fournisseurs majeurs.'
      ],
      gainEstime: fmtDZD(gainStock),
      impact: 'Réduction du BFR & Coûts de stockage',
      urgence: rotS > bm.rotationStocks.limite ? 'haute' : 'moyenne'
    });
  }

  // Action 3 : Négociation Fournisseurs
  if (dpo < bm.dpo.min && dpo > 0) {
    recommandations.push({
      priorite: 3,
      horizon: '1 à 3 mois',
      categorie: 'Achats & Crédit Fournisseurs',
      action: `Alignement des délais de paiement fournisseurs à ${bm.dpo.bon} jours`,
      detail: `Le règlement trop rapide des fournisseurs (${days(dpo)}) crée un décalage de trésorerie défavorable. Négocier 45 à 60 jours financera le BFR à hauteur de ${fmtDZD(gainDPO)}.`,
      etapes: [
        'Renégocier les conditions de paiement avec le Top 20 des fournisseurs stratégiques.',
        'Standardiser le règlement à 60 jours fin de mois par effet de commerce ou virement à terme.',
        'Regrouper les volumes d\'achats pour obtenir des facilités de crédit commercial.'
      ],
      gainEstime: fmtDZD(gainDPO),
      impact: 'Ressource d\'exploitation passive',
      urgence: 'moyenne'
    });
  }

  // Action 4 : Restructuration du FRNG & Haut de Bilan
  if (frng < 0) {
    recommandations.push({
      priorite: 1,
      horizon: '3 à 6 mois',
      categorie: 'Structure & Solvabilité',
      action: 'Rétablissement de l\'équilibre structurel du haut de bilan (FRNG positif)',
      detail: `Le FRNG est négatif (${fmtDZD(frng)}). Il est impératif de refinancer les investissements durables par des ressources stables pour supprimer le risque d'illiquidité.`,
      etapes: [
        'Consolider les fonds propres par incorporation de réserves et report à nouveau (Comptes 11/12).',
        'Convertir des concours bancaires court terme en emprunt à moyen/long terme (Compte 16).',
        'Considérer une augmentation de capital social ou un apport bloqué en compte courant (455).',
        'Céder ou arbitrer les actifs immobilisés non productifs (Comptes 21x).'
      ],
      gainEstime: 'Sécurisation du Bilan',
      impact: 'Rating Banque d\'Algérie',
      urgence: 'critique'
    });
  }

  // Action 5 : Maîtrise des Marges & Productivité
  if (margeEBE < bm.margeEBE.bon && ebe > 0) {
    recommandations.push({
      priorite: 2,
      horizon: '1 à 6 mois',
      categorie: 'Marge & Rentabilité',
      action: `Rehaussement de la marge d'EBE vers la cible de ${bm.margeEBE.norme}`,
      detail: `La marge d'EBE (${pct(margeEBE)}) doit être améliorée pour assurer un autofinancement sain. Le poids salarial absorbe ${pct(poidsPersonnel)} de la VA.`,
      etapes: [
        'Auditer les consommations de matières et réduire les rebuts dans les comptes 601/602.',
        'Renégocier les contrats de sous-traitance et de prestations externes (Comptes 61/62).',
        'Ajuster la grille tarifaire sur les gammes de produits à faible contribution unitaire.',
        'Surveiller le ratio Masse Salariale / Valeur Ajoutée (actuellement à ' + pct(poidsPersonnel) + ').'
      ],
      gainEstime: `+${pct(bm.margeEBE.bon - margeEBE)} de marge brute`,
      impact: 'CAF & Résultat Net',
      urgence: 'haute'
    });
  }

  // Action 6 : Audit & Régularité Fiscale / SCF
  if (anomaliesComptablesCount > 0) {
    recommandations.push({
      priorite: 1,
      horizon: '0 à 15 jours',
      categorie: 'Conformité & Audit SCF',
      action: `Régularisation des ${anomaliesComptablesCount} anomalies de soldes détectées`,
      detail: `L'audit de la balance a relevé des soldes anormaux (ex: ${caisseCreditrice ? 'caisse créditrice, ' : ''}${comptesAttenteBloques > 0 ? 'comptes d\'attente 47x non soldés, ' : ''}fournisseurs débiteurs ou clients créditeurs).`,
      etapes: [
        'Apurer immédiatement les soldes en suspens sur les comptes 471 à 478.',
        'Vérifier les pièces justificatives des dépenses de caisse (53x) et réinjecter les fonds nécessaires.',
        'Reclasser les avances fournisseurs en 409 et les avances clients en 419.',
        'Contrôler la cohérence des dotations aux amortissements (68x) avec les comptes 28x.'
      ],
      gainEstime: 'Conformité Fiscale & Audit',
      impact: 'Régularité des états financiers',
      urgence: 'critique'
    });
  }

  recommandations.sort((a, b) => a.priorite - b.priorite);

  // ── 15. Synthèse Exécutive Structurée ──
  const resume = buildResume({
    scoreGlobal, niveau, ca, ebe, rnet, frng, bfr, tn, dso, rotS, bfrJCA,
    margeNette, margeEBE, caf, secteur, profil, evolutions,
    nbForces: forces.length, nbFaiblesses: faiblesses.length, totalCashLibérable, solv
  });

  return {
    scoreGlobal,
    niveau,
    scores,
    secteur,
    profil,
    evolutions,
    solvabilite: solv,
    diagnosticAvance: {
      caf,
      tauxCAF,
      ratioDetteSurCAF,
      capaciteRemboursementLabel,
      partPersonnel,
      partEtat,
      partPreteurs,
      partEntreprise,
      partActionnaires,
      roe,
      roa,
      effetLevier,
      totalCashLibérable,
      gainDSO,
      gainStock,
      gainDPO,
      anomaliesComptablesCount,
      caisseCreditrice,
    },
    forces: forces.sort((a, b) => b.score - a.score),
    faiblesses: faiblesses.sort((a, b) => {
      const order = { critique: 0, eleve: 1, moyen: 2, faible: 3 };
      return (order[a.severite] || 2) - (order[b.severite] || 2);
    }),
    recommandations,
    resume,
    metriques: {
      ca, va, ebe, reop, rnet, cpers, dotam, cchfin, caf, margeEBE, margeOper, margeNette,
      tauxVA, productivite, couvertureFin, liq, autFin, dso, dpo, rotS, bfrJCA, frng, bfr, tn,
      caParSalarie, vaParSalarie, totalCashLibérable
    },
  };
}

function buildResume({ scoreGlobal, niveau, ca, ebe, rnet, frng, bfr, tn, dso, rotS, margeNette, margeEBE, caf, secteur, profil, evolutions, nbForces, nbFaiblesses, totalCashLibérable, solv }) {
  const pct_ = (v, d = 1) => `${(v * 100).toFixed(d)} %`;
  const fmt_ = (v) => (v || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  const companyName = profil.nomEntreprise ? `**${profil.nomEntreprise}**` : "l'entreprise";
  const intro = `Diagnostic financier approfondi de ${companyName} (${secteur.label}) : santé globale évaluée à ${niveau.emoji} **${niveau.label}** (${scoreGlobal}/100).\n\n`;

  const activite = `• **Activité & Rentabilité** : CA de **${fmt_(ca)} DZD**${evolutions?.caGrowth ? ` (${evolutions.caGrowth > 0 ? '+' : ''}${pct_(evolutions.caGrowth)} vs N-1)` : ''}, EBE de **${fmt_(ebe)} DZD** (${pct_(margeEBE)} du CA) et Résultat Net de **${fmt_(rnet)} DZD** (${pct_(margeNette)}).\n`;

  const equilibre = `• **Équilibre & Liquidité** : FRNG de **${fmt_(frng)} DZD** face à un BFR de **${fmt_(bfr)} DZD**, générant une Trésorerie Nette de **${fmt_(tn)} DZD**. Capacité d'autofinancement (CAF) : **${fmt_(caf)} DZD**.\n`;

  const cash = totalCashLibérable > 0 ? `• **Potentiel de Cash BFR** : L'optimisation des délais de recouvrement (${Math.round(dso)}j) et de la rotation des stocks (${Math.round(rotS)}j) permettrait de libérer **${fmt_(totalCashLibérable)} DZD** de trésorerie immédiate.\n` : '';

  const solvabiliteStr = `• **Notation Bancaire & Risque** : Score Banque d'Algérie de **${solv.bancaire?.scoreBA || 14}/20** (${solv.bancaire?.ratingBA || 'Favorable'}) et Altman Z''-Score de **${(solv.zScore || 0).toFixed(2)}** (${solv.zoneLabel || 'Zone Sûre'}).\n\n`;

  const conclusion = `Synthèse : **${nbForces} force(s) motrice(s)** et **${nbFaiblesses} vulnérabilité(s)** à traiter selon le plan d'action préconisé.`;

  return intro + activite + equilibre + cash + solvabiliteStr + conclusion;
}

/* ─── Générateur de Rapports Structurés Locaux Immédiats ─── */
export function generateLocalStructuredReport(data, reportType = 'audit_diagnostic') {
  if (!data) return '';
  const a = runAIAnalysis(data);
  const m = a.metriques;
  const diag = a.diagnosticAvance || {};
  const solv = a.solvabilite || {};
  const sec = a.secteur || {};
  const b = data.bilan || {};
  const s = data.sig || {};

  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const company = a.profil?.nomEntreprise || 'Entité sous revue';

  if (reportType === 'audit_diagnostic') {
    return `# 📊 RAPPORT D'AUDIT & DIAGNOSTIC FINANCIER COMPLET
**Entité** : ${company} | **Secteur** : ${sec.label} | **Date** : ${dateStr}
**Référentiel** : Système Comptable Financier (SCF Algérie — Loi 07-11 / Décret 08-156)

---

### 1. SYNTHÈSE MANAGÉRIALE & SCORE GLOBAL
- **Score Global de Santé Financière** : **${a.scoreGlobal} / 100 — ${a.niveau.emoji} Situation ${a.niveau.label}**
- **Score Banque d'Algérie (Centrale des Risques)** : **${solv.bancaire?.scoreBA || 14} / 20** (${solv.bancaire?.ratingBA || 'Favorable'})
- **Modèle Altman Z'' (EM-Score)** : **${solv.zScore ? solv.zScore.toFixed(2) : 'N/D'}** (${solv.zoneLabel || 'Zone Sûre'} — Risque de défaillance : ${solv.risqueDefaillance || 'Faible'})

${a.resume}

---

### 2. ÉQUILIBRE FONCTIONNEL DU BILAN & TRÉSORERIE
- **Fonds de Roulement Net Global (FRNG)** : **${fmtDZD(b.frng)}**
  * ${(b.frng || 0) >= 0 ? '✓ Les capitaux stables couvrent intégralement les immobilisations durables et dégagent un excédent de financement structurel.' : '✗ Déficit de FRNG : Les investissements durables sont financés par de la dette court terme.'}
- **Besoin en Fonds de Roulement (BFR)** : **${fmtDZD(b.bfr)}** (soit **${Math.round(m.bfrJCA)} jours de CA**)
- **Trésorerie Nette (TN = FRNG - BFR)** : **${fmtDZD(b.tn)}**
  * ${(b.tn || 0) >= 0 ? '✓ Position de liquidité autonome sans recours aux découverts bancaires.' : '✗ Tension de liquidité : dépendance envers les autorisations de découvert bancaire.'}
- **Capacité d'Autofinancement (CAF)** : **${fmtDZD(diag.caf)}** (${pct(diag.tauxCAF)} du CA)
- **Capacité d'Extinction de la Dette (Dettes LT / CAF)** : **${diag.ratioDetteSurCAF ? diag.ratioDetteSurCAF.toFixed(2) + ' an(s)' : 'N/D'}** (${diag.capaciteRemboursementLabel})

---

### 3. FORMATION DU RÉSULTAT & PARTAGE DE LA VALEUR AJOUTÉE (TCR)
- **Chiffre d'Affaires Net HT** : **${fmtDZD(s.chiffreAffaires)}**
- **Valeur Ajoutée (VA)** : **${fmtDZD(s.valeurAjoutee)}** (${pct(m.tauxVA)} du CA — Norme secteur : ${sec.benchmarks?.tauxVA?.norme || '≥25%'})
- **Excédent Brut d'Exploitation (EBE)** : **${fmtDZD(s.ebe)}** (${pct(m.margeEBE)} du CA — Norme secteur : ${sec.benchmarks?.margeEBE?.norme || '≥10%'})
- **Résultat d'Exploitation (EBIT)** : **${fmtDZD(s.resultatExploitation)}** (${pct(m.margeOper)} du CA)
- **Résultat Net de l'Exercice** : **${fmtDZD(s.resultatNet)}** (${pct(m.margeNette)} du CA)

| Partage de la Richesse Créée (VA) | Montant Estimé | Taux (%) | Norme / Appréciation |
|---|---|---|---|
| Rémunération du Personnel (63) | ${fmtDZD(s.chargesPersonnel)} | ${pct(diag.partPersonnel)} | ${diag.partPersonnel <= 0.65 ? '✓ Équilibré (≤ 65%)' : '△ Prépondérant (> 65%)'} |
| Contribution État & Impôts (64 + 695) | ${fmtDZD((s.impotsTaxes || 0) + (s.impotsBenefices || s.impotsSurResultats || 0))} | ${pct(diag.partEtat)} | Prélèvements obligatoires |
| Rémunération des Prêteurs (66) | ${fmtDZD(s.chargesFinancieres)} | ${pct(diag.partPreteurs)} | Coût de l'endettement |
| Autofinancement & Maintien (CAF) | ${fmtDZD(diag.caf)} | ${pct(diag.partEntreprise)} | Richesse conservée |

---

### 4. DÉLAIS DE ROTATION & POTENTIEL DE CASH LIBÉRABLE
- **Délai Clients (DSO)** : **${Math.round(m.dso)} jours** (Norme sectorielle : ${sec.benchmarks?.dso?.norme || '≤ 60j'})
- **Délai Fournisseurs (DPO)** : **${Math.round(m.dpo)} jours** (Norme sectorielle : ${sec.benchmarks?.dpo?.norme || '45-75j'})
- **Rotation des Stocks** : **${Math.round(m.rotS)} jours** (Norme sectorielle : ${sec.benchmarks?.rotationStocks?.norme || '≤ 90j'})

💰 **Potentiel de Cash Mobilisable sur le BFR : ${fmtDZD(diag.totalCashLibérable)}**
- Gain sur accélération du recouvrement clients (DSO) : **${fmtDZD(diag.gainDSO)}**
- Gain sur déstockage des références dormantes : **${fmtDZD(diag.gainStock)}**

---

### 5. FORCES & VULNÉRABILITÉS MAJEURES
${a.forces.slice(0, 4).map((f, i) => `✓ **Force ${i + 1}** [${f.cat}] : ${f.titre}\n  ${f.detail}`).join('\n')}

${a.faiblesses.slice(0, 4).map((f, i) => `✗ **Alerte ${i + 1}** [${f.severite.toUpperCase()}] : ${f.titre}\n  ${f.detail}`).join('\n')}
`;
  }

  if (reportType === 'recommendations_plan') {
    return `# 🎯 PLAN D'ACTION STRATÉGIQUE & FEUILLE DE ROUTE OPÉRATIONNELLE DAF
**Entité** : ${company} | **Secteur** : ${sec.label} | **Date** : ${dateStr}
**Objectif Global** : Sécurisation de la trésorerie, allègement du BFR et consolidation de la marge nette.

---

### 1. PHASE 1 : ACTIONS D'URGENCE IMMÉDIATE (0 À 30 JOURS)
${a.recommandations.filter(r => r.priorite === 1 || r.urgence === 'critique').map((r, i) => `
#### 🔴 Action 1.${i + 1} : ${r.action}
- **Horizon** : Immédiat (0-15 jours) | **Catégorie** : ${r.categorie}
- **Diagnostic** : ${r.detail}
- **Impact Attendu** : ${r.gainEstime || 'Sécurisation immédiate'}
- **Étapes d'Exécution** :
${(r.etapes || []).map(e => `  * ${e}`).join('\n')}
`).join('')}

---

### 2. PHASE 2 : ACTIONS À COURT TERME (1 À 3 MOIS)
${a.recommandations.filter(r => r.priorite === 2 || r.urgence === 'haute').map((r, i) => `
#### 🟠 Action 2.${i + 1} : ${r.action}
- **Horizon** : Court terme (1-3 mois) | **Catégorie** : ${r.categorie}
- **Diagnostic** : ${r.detail}
- **Impact Attendu** : ${r.gainEstime || 'Optimisation BFR'}
- **Étapes d'Exécution** :
${(r.etapes || []).map(e => `  * ${e}`).join('\n')}
`).join('')}

---

### 3. PHASE 3 : ACTIONS STRATÉGIQUES DE MOYEN TERME (3 À 12 MOIS)
${a.recommandations.filter(r => r.priorite === 3 || r.urgence === 'moyenne' || r.urgence === 'basse').map((r, i) => `
#### 🔵 Action 3.${i + 1} : ${r.action}
- **Horizon** : 3 à 12 mois | **Catégorie** : ${r.categorie}
- **Diagnostic** : ${r.detail}
- **Impact Attendu** : ${r.gainEstime || 'Haut de bilan'}
- **Étapes d'Exécution** :
${(r.etapes || []).map(e => `  * ${e}`).join('\n')}
`).join('')}

---

### 4. TABLEAU DE BORD DAF & 6 INDICATEURS CLÉS DE SUIVI
| KPI Stratégique | Valeur Actuelle | Cible Normative | Fréquence de Suivi |
|---|---|---|---|
| Délai Clients (DSO) | ${Math.round(m.dso)} jours | ≤ 60 jours | Hebdomadaire |
| Rotation des Stocks | ${Math.round(m.rotS)} jours | ≤ 90 jours | Mensuelle |
| Délai Fournisseurs (DPO) | ${Math.round(m.dpo)} jours | 45 à 60 jours | Mensuelle |
| Taux de Marge d'EBE | ${pct(m.margeEBE)} | ≥ 10.0 % | Mensuelle |
| Trésorerie Nette (TN) | ${fmtDZD(b.tn)} | > 0 DZD | Hebdomadaire |
| Ratio Dettes / CAF | ${diag.ratioDetteSurCAF ? diag.ratioDetteSurCAF.toFixed(1) + ' ans' : 'N/D'} | ≤ 3.5 ans | Trimestrielle |
`;
  }

  if (reportType === 'banque_credit') {
    return `# 🏦 NOTE D'INSTRUCTION BANCAIRE & DOSSIER DE CRÉDIT
**Entité** : ${company} | **Secteur** : ${sec.label} | **Date** : ${dateStr}
**Destinataire** : Direction des Engagements / Comité de Crédit Bancaire
**Référentiel** : Banque d'Algérie (Centrale des Risques) & Ratios Prudentiels

---

### 1. SCORE OFFICIEL BANQUE D'ALGÉRIE & SYNTHÈSE DU RISQUE
- **Score Global Centrale des Risques** : **${solv.bancaire?.scoreBA || 14} / 20 points**
- **Profil Emprunteur** : **${solv.bancaire?.ratingBA || 'Favorable'}** (Statut dossier : **${solv.bancaire?.statutCredit || 'FAVORABLE'}**)
- **Modèle Altman Z'' (EM-Score)** : **${solv.zScore ? solv.zScore.toFixed(2) : 'N/D'}** (${solv.zoneLabel || 'Zone Sûre'})
- **Probabilité de Défaillance Estimée** : **${solv.risqueDefaillance || 'Faible'}**

| Pilier de Notation Banque d'Algérie | Indicateur Calculé | Score Attribué | Barème Max | Appréciation |
|---|---|---|---|---|
| Autonomie Financière (CP / DLT) | ${solv.bancaire?.detailsBA?.autonomie?.val ? solv.bancaire.detailsBA.autonomie.val.toFixed(2) : 'N/D'} | ${solv.bancaire?.detailsBA?.autonomie?.score || 4} pts | 5.0 pts | ${solv.bancaire?.detailsBA?.autonomie?.score >= 4 ? 'Solide' : 'À surveiller'} |
| Rentabilité Brute (Marge EBE) | ${pct(m.margeEBE)} | ${solv.bancaire?.detailsBA?.rentabilite?.score || 4} pts | 5.0 pts | ${m.margeEBE >= 0.10 ? 'Satisfaisante' : 'Moyenne'} |
| Liquidité Générale (AC / DCT) | ${m.liq.toFixed(2)}x | ${solv.bancaire?.detailsBA?.liquidite?.score || 4} pts | 5.0 pts | ${m.liq >= 1.2 ? 'Sécurisée' : 'Tendue'} |
| Couverture des Frais Financiers | ${solv.bancaire?.couvertureChargesFin ? solv.bancaire.couvertureChargesFin.toFixed(1) + 'x' : '99x'} | ${solv.bancaire?.detailsBA?.couverture?.score || 4} pts | 5.0 pts | ${solv.bancaire?.couvertureChargesFin >= 3 ? 'Large couverture' : 'Sensible'} |

---

### 2. CAPACITÉ DE REMBOURSEMENT & COUVERTURE DU SERVICE DE LA DETTE
- **Capacité d'Autofinancement (CAF)** : **${fmtDZD(diag.caf)}** (${pct(diag.tauxCAF)} du CA)
- **Dettes Financières à Moyen/Long Terme** : **${fmtDZD(solv.bancaire?.dettesFinancieresLT || 0)}**
- **Capacité d'Extinction de la Dette (Dettes / CAF)** : **${diag.ratioDetteSurCAF ? diag.ratioDetteSurCAF.toFixed(2) + ' an(s)' : '0 an'}** (Norme bancaire : ≤ 3.5 ans)
- **Capacité d'Endettement Additionnelle Maximale** : **${fmtDZD(solv.bancaire?.capaciteEndettementMax || 0)}** (selon la règle des 3.5 × EBE)

---

### 3. STRUCTURE DES GARANTIES & PATRIMOINE MOBILISABLE
- **Actifs Non Courants Nets (Immobilisations)** : **${fmtDZD(b.emploisStables)}** (Assiette hypothécaire potentielle)
- **Actif Circulant (Stocks + Créances clients)** : **${fmtDZD(b.actifCirculant)}** (Gage sur stocks / nantissement créances)
- **Trésorerie Active & Disponibilités** : **${fmtDZD(b.tresorerieActive)}**

---

### 4. AVIS MOTIVÉ DU COMITÉ DE CRÉDIT
- **Recommandation** : **${solv.bancaire?.statutCredit === 'FAVORABLE' ? 'AVIS FAVORABLE' : 'AVIS FAVORABLE SOUS CONDITIONS'}**
- **Lignes Conseillées** : Autorisation de lignes de crédit d'exploitation (facilité de caisse, escompte, crédit documentaire) ou crédit d'investissement adossé à la CAF.
- **Covenants Recommandés** :
  * Maintien d'un ratio Capitaux Propres / Total Bilan supérieur à 30%.
  * Transmission semestrielle des situations comptables et reporting de balance âgée clients.
`;
  }

  return '';
}

/* ─── Construction du Contexte pour Gemini ─── */
export function buildGeminiContext(data, analysisResult) {
  if (!data || !analysisResult) return '';
  const { sig: s = {}, bilan: b = {} } = data;
  const m = analysisResult.metriques;
  const diag = analysisResult.diagnosticAvance || {};
  const p = analysisResult.profil || {};
  const sec = analysisResult.secteur || {};
  const solv = analysisResult.solvabilite || {};
  const fmt = (v) => (v || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' DZD';
  const pct_ = (v) => `${(v * 100).toFixed(1)}%`;

  return `Tu es un Directeur Financier (DAF) et Commissaire aux Comptes de premier rang, expert incontesté du Système Comptable Financier algérien (SCF, Loi 07-11 / Décret 08-156) et des pratiques bancaires en Algérie (Banque d'Algérie).

Effectue une analyse financière approfondie, critique, chiffrée et ultra-rigoureuse sur la base des données financières exhaustives ci-dessous :

## I. FICHE SIGNALÉTIQUE & SECTEUR D'ACTIVITÉ
- Entité : ${p.nomEntreprise || 'Entité sous revue d\'audit'}
- Forme Juridique : ${p.formeJuridique || 'Non spécifiée'}
- Secteur : ${sec.label || 'Industrie / Général'} (Taux IBS applicable : ${sec.tauxIBS || '19%'})
- Description secteur : ${sec.description || ''}
- Effectif Salarié : ${p.effectif || 'N/D'} ETP

## II. ÉQUILIBRE FONCTIONNEL & GESTION DE LA TRÉSORERIE (BILAN SCF)
- Fonds de Roulement Net Global (FRNG) : ${fmt(b.frng)} (${(b.frng || 0) >= 0 ? 'Positif / Excédentaire' : 'Négatif / Déséquilibre structurel'})
- Besoin en Fonds de Roulement (BFR) : ${fmt(b.bfr)} (${Math.round(m.bfrJCA)} jours de CA - Norme secteur : ${sec.benchmarks?.bfrJoursCA?.norme})
- Trésorerie Nette (TN = FRNG - BFR) : ${fmt(b.tn)} (${(b.tn || 0) >= 0 ? 'Excédentaire' : 'Tension / Découvert'})
- Capacité d'Autofinancement (CAF) : ${fmt(diag.caf)} (${pct_(diag.tauxCAF)} du CA)
- Capacité de Remboursement de la Dette (Dettes LT / CAF) : ${diag.ratioDetteSurCAF ? diag.ratioDetteSurCAF.toFixed(2) + ' ans' : 'N/D'} (${diag.capaciteRemboursementLabel || ''})

## III. CYCLE D'EXPLOITATION & POTENTIEL DE CASH DÉBLOCABLE
- Délai de Recouvrement Clients (DSO) : ${Math.round(m.dso)} jours (Norme sectorielle : ${sec.benchmarks?.dso?.norme})
- Délai de Paiement Fournisseurs (DPO) : ${Math.round(m.dpo)} jours (Norme sectorielle : ${sec.benchmarks?.dpo?.norme})
- Rotation Moyenne des Stocks : ${Math.round(m.rotS)} jours (Norme sectorielle : ${sec.benchmarks?.rotationStocks?.norme})
- Cash potentiel mobilisable par optimisation du BFR : ${fmt(diag.totalCashLibérable)} (DSO : ${fmt(diag.gainDSO)}, Stocks : ${fmt(diag.gainStock)})

## IV. RENTABILITÉ ÉCONOMIQUE, MARGES & PARTAGE DE LA VALEUR AJOUTÉE
- Chiffre d'Affaires Net HT : ${fmt(s.chiffreAffaires)}
- Valeur Ajoutée (VA) : ${fmt(s.valeurAjoutee)} (${pct_(m.tauxVA)} du CA - Norme : ${sec.benchmarks?.tauxVA?.norme})
- Partage de la Valeur Ajoutée :
  * Part du Personnel (63) : ${pct_(diag.partPersonnel)}
  * Part de l'État (64 + 695) : ${pct_(diag.partEtat)}
  * Part des Prêteurs (66) : ${pct_(diag.partPreteurs)}
  * Part de l'Autofinancement (CAF) : ${pct_(diag.partEntreprise)}
  * Part du Résultat Net : ${pct_(diag.partActionnaires)}
- Excédent Brut d'Exploitation (EBE) : ${fmt(s.ebe)} (${pct_(m.margeEBE)} du CA - Norme : ${sec.benchmarks?.margeEBE?.norme})
- Résultat d'Exploitation (EBIT) : ${fmt(s.resultatExploitation)} (${pct_(m.margeOper)} du CA)
- Résultat Net Final : ${fmt(s.resultatNet)} (${pct_(m.margeNette)} du CA - Norme : ${sec.benchmarks?.margeNette?.norme})
- Rentabilité des Capitaux Propres (ROE) : ${pct_(diag.roe)} | Rentabilité Économique (ROA) : ${pct_(diag.roa)}
- Effet de Levier Financier (ROE - ROA) : ${pct_(diag.effetLevier)}

## V. SOLVABILITÉ, RATING BANQUE D'ALGÉRIE & RISQUE DE DÉFAILLANCE
- Score Banque d'Algérie (Centrale des Risques) : ${solv.bancaire?.scoreBA || 14} / 20 (Rating : ${solv.bancaire?.ratingBA || 'Favorable'})
- Score Altman Z'' (Modèle EM-Score) : ${solv.zScore ? solv.zScore.toFixed(2) : 'N/D'} (${solv.zoneLabel || 'Zone Sûre'} — Rating synthétique : ${solv.rating || 'N/D'})
- Risque de défaillance estimé : ${solv.risqueDefaillance || 'Faible'}
- Liquidité Générale : ${m.liq.toFixed(2)}x (Norme : ${sec.benchmarks?.liquiditeGenerale?.norme})
- Autonomie Financière : ${pct_(m.autFin)} (Norme : ${sec.benchmarks?.autonomieFinanciere?.norme})

## VI. AUDIT DES ANOMALIES DE BALANCES (SCF)
- Nombre d'irrégularités détectées : ${diag.anomaliesComptablesCount || 0}
- Caisse créditrice : ${diag.caisseCreditrice ? 'OUI (Anomalie critique)' : 'NON (Conforme)'}

## VII. SCORE GLOBAL MULTIDIMENSIONNEL : ${analysisResult.scoreGlobal} / 100 — Situation ${analysisResult.niveau.label}
`;
}

/* ─── Générateur de Rapports Approfondis avec Gemini ─── */
export async function generateGeminiReport(data, reportType = 'audit_diagnostic', geminiKey = '') {
  if (!geminiKey) {
    throw new Error("Clé API Google Gemini non configurée. Veuillez renseigner votre clé API dans les Paramètres ou l'en-tête.");
  }
  if (!data) {
    throw new Error("Aucune donnée financière disponible pour générer le rapport.");
  }

  const analysis = runAIAnalysis(data);
  const context  = buildGeminiContext(data, analysis);

  let promptFocus = '';
  if (reportType === 'audit_diagnostic') {
    promptFocus = `
## MISSION : RAPPORT D'AUDIT ET DE DIAGNOSTIC FINANCIER STRATÉGIQUE (NIVEAU DAF / EXPERT-COMPTABLE)
Rédige un rapport exhaustif, analytique et approfondi destiné au Conseil d'Administration et à la Direction Générale.

Structure impérative du rapport :
# 🏛️ RAPPORT D'AUDIT FINANCIER STRATÉGIQUE & DIAGNOSTIC APPROFONDI
**Référentiel** : Système Comptable Financier (SCF Algérie — Loi 07-11) | **Date** : ${new Date().toLocaleDateString('fr-FR')}

### 1. SYNTHÈSE EXÉCUTIVE & NOTATION MULTICRITÈRES
- Synthèse managériale des 3 faits marquants de l'exercice
- Tableau d'évaluation des 5 piliers financiers (Score /100, Niveau de risque, Appréciation)
- Positionnement du Score Banque d'Algérie (/20) et du Modèle Altman Z''

### 2. AUDIT DE L'ÉQUILIBRE FINANCIER & DE LA STRUCTURE DE BILAN
- Analyse approfondie du triptyque fondamental : **FRNG, BFR et Trésorerie Nette**
- Diagnostic de la couverture des emplois stables par les ressources durables
- Analyse de la Capacité d'Autofinancement (CAF) et de la capacité d'extinction de la dette

### 3. DIAGNOSTIC DE LA RENTABILITÉ & PARTAGE DE LA VALEUR AJOUTÉE (SIG / TCR)
- Analyse de la cascade des soldes intermédiaires : Chiffre d'affaires, Valeur Ajoutée, EBE, Résultat d'Exploitation, Résultat Net
- Analyse de la répartition de la Valeur Ajoutée (Personnel, État, Prêteurs, Autofinancement, Actionnaires)
- Diagnostic de la rentabilité financière (ROE), économique (ROA) et de l'effet de levier

### 4. GESTION DU BFR & POTENTIEL DE TRÉSORERIE DÉBLOCABLE
- Analyse croisée des 3 délais : DSO Clients, DPO Fournisseurs et Rotation des Stocks vs Normes Sectorielles
- Chiffrage précis en DZD du cash immobilisé et potentiel de récupération à court terme

### 5. AUDIT DE CONFORMITÉ DES COMPTES & RISQUES FISCAUX SCF
- Examen des anomalies de balance (sens de soldes, caisse, comptes 47x d'attente, TVA, amortissements 28x/68x)
- Recommandations d'ajustements d'écritures avant clôture

### 6. PLAN STRATÉGIQUE D'ACTION CHIFFRÉ & CALENDRIER DAF
- **Phase 1 : Actions Immédiates (0 à 30 jours)** : Mesures d'urgence trésorerie & régularisations
- **Phase 2 : Actions à Court Terme (1 à 3 mois)** : Optimisation BFR & renégociation des marges
- **Phase 3 : Actions Stratégiques (3 à 12 mois)** : Restructuration du haut de bilan & autofinancement
`;
  } else if (reportType === 'recommendations_plan') {
    promptFocus = `
## MISSION : PLAN D'ACTION STRATÉGIQUE DAF & FEUILLE DE ROUTE OPÉRATIONNELLE
Rédige une feuille de route détaillée et quantifiée avec des objectifs chiffrés en DZD pour optimiser le cash et booster la rentabilité.

Structure impérative :
# 🎯 FEUILLE DE ROUTE STRATÉGIQUE & PLAN D'OPTIMISATION FINANCIÈRE
**Secteur** : ${analysis?.secteur?.label || 'Industrie'} | **Cible de Gain de Cash** : ${fmtDZD(analysis?.diagnosticAvance?.totalCashLibérable || 0)}

### 1. PLAN DE CHOC TRÉSORERIE & CASH-FLOW (30 JOURS)
- Recouvrement créances clients (réduction du DSO de ${Math.round(analysis?.metriques?.dso || 0)}j à ${analysis?.secteur?.benchmarks?.dso?.bon || 60}j) — Gain : ${fmtDZD(analysis?.diagnosticAvance?.gainDSO || 0)}
- Apurement des stocks dormants — Gain : ${fmtDZD(analysis?.diagnosticAvance?.gainStock || 0)}

### 2. PLAN D'OPTIMISATION DE LA RENTABILITÉ & CHARGES (90 JOURS)
- Analyse des postes de charges réductibles (Comptes 60, 61, 62)
- Amélioration de la productivité du travail et maîtrise du ratio Charges de personnel / VA

### 3. PLAN DE RESTRUCTURATION DU BILAN & FONDS PROPRES (1 AN)
- Consolidation du FRNG et refinancement des investissements
- Politique de distribution de dividendes vs mise en réserve statutaire

### 4. MATRICE DE SUIVI & TABLEAU DE BORD DAF
- Les 6 KPIs hebdomadaires avec seuils d'alerte rouge/jaune/vert.
`;
  } else if (reportType === 'banque_credit') {
    promptFocus = `
## MISSION : NOTE D'ANALYSE FINANCIÈRE POUR COMITÉ DE CRÉDIT BANCAIRE
Rédige une note de crédit bancaire rigoureuse, impartiale et technique selon les critères de la Banque d'Algérie.

Structure impérative :
# 🏦 NOTE D'INSTRUCTION DE CRÉDIT & ANALYSE DU RISQUE EMPRUNTEUR
**Dossier** : ${analysis?.profil?.nomEntreprise || 'Entreprise sous revue'} | **Référentiel** : Banque d'Algérie (Centrale des Risques)

### 1. SCORE BANQUE D'ALGÉRIE & PROFIL DE RISQUE
- Score officiel sur 20 points : **${analysis?.solvabilite?.bancaire?.scoreBA || 14} / 20** (Profil : **${analysis?.solvabilite?.bancaire?.ratingBA || 'Favorable'}**)
- Décomposition des 4 piliers : Autonomie financière, Marge brute d'EBE, Liquidité générale, Couverture des charges financières
- Score Altman Z'' (${analysis?.solvabilite?.zScore?.toFixed(2) || 'N/D'}) et probabilité de défaillance

### 2. CAPACITÉ DE REMBOURSEMENT & SERVICE DE LA DETTE
- Capacité d'Autofinancement (CAF) : ${fmtDZD(analysis?.diagnosticAvance?.caf || 0)}
- Capacité d'endettement résiduelle (Règle : Dettes LT ≤ 3.5 × EBE) : ${fmtDZD(analysis?.solvabilite?.bancaire?.capaciteEndettementMax || 0)}
- Ratio de couverture des charges financières : ${analysis?.solvabilite?.bancaire?.couvertureChargesFin?.toFixed(2) || 'N/D'}x

### 3. AVIS MOTIVÉ DU COMITÉ DES ENGAGEMENTS
- Recommandation finale : Favorable / Favorable sous conditions / Réservé
- Covenants bancaires et garanties réelles/personnelles à exiger (Hypothèque, cautionnement, nantissement de fonds).
`;
  }

  const fullPrompt = `${context}\n\n${promptFocus}\n\n---\nRègles de rédaction strictes : Rédige avec un ton d'expert financier de haut niveau, sans fioritures, avec des tableaux comparatifs en markdown clairs, des formules mathématiques, des montants précis chiffrés en DZD et des recommandations immédiatement exploitables.`;

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];
  let lastError = null;

  for (const modelName of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4000,
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Erreur HTTP ${response.status}`);
      }

      const json = await response.json();
      const generatedText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generatedText && generatedText.trim().length > 50) {
        return generatedText;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Tentative Gemini avec ${modelName} a échoué :`, err.message);
    }
  }

  throw lastError || new Error("Impossible de générer le rapport avec l'API Gemini.");
}
