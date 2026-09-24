import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie } from 'recharts';

/* ═══════════════════════════════════════════════════════════
   BAIQ — Graphiques du tableau de bord
   ═══════════════════════════════════════════════════════════
   Module séparé et chargé à la demande (cf. App.jsx) : recharts, la bibliothèque la
   plus lourde de l'application, n'est ainsi plus téléchargée avant l'import d'une
   balance, quand aucun graphique n'est encore affiché.
*/

/** Produits vs charges de l'exercice (barres colorées). */
export function GraphiqueProduitsCharges({ barres, fmt }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={barres} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} width={80} />
        <Tooltip formatter={(val) => fmt(val)} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
        <Bar dataKey="Montant" radius={[6, 6, 0, 0]} maxBarSize={90}>
          {barres.map((entry, index) => (
            <Cell key={`cell-annual-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Répartition des charges de la classe 6 (anneau). */
export function DonutCharges({ postes, fmt }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          formatter={(val, name, entry) => [`${fmt(val)} (${entry.payload.pct}%)`, name]}
        />
        <Pie
          data={postes}
          dataKey="val"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={105}
          paddingAngle={4}
          cornerRadius={5}
        >
          {postes.map((entry, index) => (
            <Cell key={`cell-expense-${index}`} fill={entry.color} stroke="var(--surface)" strokeWidth={2} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Stocks initiaux et finaux par catégorie (barres groupées). */
export function GraphiqueStocks({ categories, fmt }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={categories.map(c => ({
          name: c.code + ' ' + (c.label.split('—')[1]?.trim()?.split(' ')[0] || c.label),
          'Stock Initial': c.stockInitial,
          'Stock Final': c.stockFinal,
        }))}
        margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
        barGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
        <Tooltip
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          formatter={(v, n) => [fmt(v), n]}
        />
        <Bar dataKey="Stock Initial" fill="#94a3b8" radius={[5, 5, 0, 0]} maxBarSize={28} />
        <Bar dataKey="Stock Final" fill="#1b6e8c" radius={[5, 5, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
