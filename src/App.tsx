// @ts-nocheck
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, Target, Plus, Trash2, Wallet,
  ArrowUpCircle, ArrowDownCircle, Brain, Upload, Key, X, Send, RefreshCw,
} from 'lucide-react';

const COLORS = ['#D4A853','#4ECDC4','#E8734A','#6B8CFF','#A78BFA','#34D399','#F472B6','#60A5FA'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
const CATEGORIES = {
  income: ['Løn','Freelance','Udlejning','Investering','Opsparing','Andet'],
  expense: ['Bolig','Mad & Drikke','Transport','Abonnementer','Tøj','Underholdning','Sundhed','Opsparing','Andet'],
};
const DEFAULT_BUDGETS = {
  'Bolig': 10000, 'Mad & Drikke': 4000, 'Transport': 2000,
  'Abonnementer': 1000, 'Tøj': 2000, 'Underholdning': 1500,
  'Sundhed': 1000, 'Opsparing': 3000, 'Andet': 2000,
};

const formatDKK = (n) => new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(n);
const today = () => new Date().toISOString().split('T')[0];
const currentMonth = () => new Date().toISOString().slice(0, 7);
const monthKey = (date) => date?.slice(0, 7) || '';
const getLast12Months = () => {
  const seen = new Set();
  const months = [], d = new Date();
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!seen.has(key)) { seen.add(key); months.push(key); }
    d.setMonth(d.getMonth() - 1);
  }
  return months;
};
const getPrevMonth = (month) => {
  const d = new Date(month + '-01');
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const pct = (curr, prev) => prev === 0 ? null : (((curr - prev) / prev) * 100).toFixed(1);
const monthLabel = (m) => MONTH_NAMES[parseInt(m.slice(5)) - 1] + ' ' + m.slice(0, 4);
const shortMonthLabel = (m) => MONTH_NAMES[parseInt(m.slice(5)) - 1];

const initialTransactions = [
  { id: 1, type: 'income', amount: 38000, category: 'Løn', description: 'Månedlig løn', date: '2026-05-25', recurring: true },
  { id: 2, type: 'expense', amount: 9500, category: 'Bolig', description: 'Husleje', date: '2026-05-01', recurring: true },
  { id: 3, type: 'expense', amount: 3200, category: 'Mad & Drikke', description: 'Dagligvarer', date: '2026-05-15', recurring: false },
  { id: 4, type: 'expense', amount: 499, category: 'Abonnementer', description: 'Streaming', date: '2026-05-10', recurring: true },
  { id: 5, type: 'income', amount: 5000, category: 'Freelance', description: 'Design projekt', date: '2026-05-20', recurring: false },
  { id: 6, type: 'expense', amount: 1200, category: 'Transport', description: 'DSB kort', date: '2026-05-01', recurring: true },
  { id: 7, type: 'expense', amount: 2000, category: 'Opsparing', description: 'Månedlig opsparing', date: '2026-05-05', recurring: true },
  { id: 8, type: 'income', amount: 38000, category: 'Løn', description: 'Månedlig løn', date: '2026-04-25', recurring: true },
  { id: 9, type: 'expense', amount: 9500, category: 'Bolig', description: 'Husleje', date: '2026-04-01', recurring: true },
  { id: 10, type: 'expense', amount: 4100, category: 'Mad & Drikke', description: 'Dagligvarer', date: '2026-04-15', recurring: false },
  { id: 11, type: 'expense', amount: 499, category: 'Abonnementer', description: 'Streaming', date: '2026-04-10', recurring: true },
  { id: 12, type: 'expense', amount: 1200, category: 'Transport', description: 'DSB kort', date: '2026-04-01', recurring: true },
  { id: 13, type: 'expense', amount: 2500, category: 'Tøj', description: 'Nyt tøj', date: '2026-04-20', recurring: false },
];

const initialGoals = [
  { id: 1, name: 'Sommerferie', target: 20000, saved: 8500, color: '#D4A853', icon: '✈️' },
  { id: 2, name: 'Nødfond', target: 50000, saved: 22000, color: '#4ECDC4', icon: '🛡️' },
  { id: 3, name: 'Ny laptop', target: 15000, saved: 4200, color: '#E8734A', icon: '💻' },
];

export default function App() {
  const [transactions, setTransactions] = useState(() => {
    try { const s = localStorage.getItem('budget_transactions'); return s ? JSON.parse(s) : initialTransactions; } catch { return initialTransactions; }
  });
  const [goals, setGoals] = useState(() => {
    try { const s = localStorage.getItem('budget_goals'); return s ? JSON.parse(s) : initialGoals; } catch { return initialGoals; }
  });
  const [budgets, setBudgets] = useState(() => {
    try { const s = localStorage.getItem('budget_limits'); return s ? JSON.parse(s) : DEFAULT_BUDGETS; } catch { return DEFAULT_BUDGETS; }
  });
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('budget_apikey') || '');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [form, setForm] = useState({ type: 'expense', amount: '', category: 'Mad & Drikke', description: '', date: today(), recurring: false });
  const [goalForm, setGoalForm] = useState({ name: '', target: '', saved: '', icon: '🎯' });
  const [addGoalAmount, setAddGoalAmount] = useState({});
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hej! Jeg er din personlige økonomi-assistent. Stil mig spørgsmål om dine udgifter, f.eks. "Hvad brugte jeg mest på i maj?" eller "Hvordan ser min opsparing ud?"' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { localStorage.setItem('budget_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('budget_goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('budget_limits', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('budget_apikey', apiKey); }, [apiKey]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const monthTx = useMemo(() => transactions.filter(t => monthKey(t.date) === selectedMonth), [transactions, selectedMonth]);
  const prevMonth = useMemo(() => getPrevMonth(selectedMonth), [selectedMonth]);
  const prevMonthTx = useMemo(() => transactions.filter(t => monthKey(t.date) === prevMonth), [transactions, prevMonth]);
  const totalIncome = useMemo(() => monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthTx]);
  const totalExpense = useMemo(() => monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [monthTx]);
  const prevIncome = useMemo(() => prevMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [prevMonthTx]);
  const prevExpense = useMemo(() => prevMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [prevMonthTx]);
  const balance = totalIncome - totalExpense;
  const prevBalance = prevIncome - prevExpense;
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;

  const categorySpend = useMemo(() => {
    const map = {};
    monthTx.filter(t => t.type === 'expense').forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return map;
  }, [monthTx]);

  const budgetAlerts = useMemo(() => {
    return Object.entries(categorySpend).filter(([cat, spent]) => {
      const limit = budgets[cat];
      return limit && spent >= limit * 0.8;
    }).map(([cat, spent]) => ({ cat, spent, limit: budgets[cat], p: Math.round((spent / budgets[cat]) * 100) }));
  }, [categorySpend, budgets]);

  const monthComparison = useMemo(() => {
    return CATEGORIES.expense.map(cat => {
      const curr = monthTx.filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
      const prev = prevMonthTx.filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
      return { cat, curr, prev, pctChange: pct(curr, prev) };
    }).filter(r => r.curr > 0 || r.prev > 0);
  }, [monthTx, prevMonthTx]);

  const pieData = useMemo(() => Object.entries(categorySpend).map(([name, value]) => ({ name, value })), [categorySpend]);

  const barData = useMemo(() => {
    const months = {};
    transactions.forEach(t => {
      const m = monthKey(t.date);
      if (!months[m]) months[m] = { month: m, label: shortMonthLabel(m), Indtægt: 0, Udgift: 0 };
      if (t.type === 'income') months[m].Indtægt += t.amount;
      else months[m].Udgift += t.amount;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [transactions]);

  const addTransaction = () => {
    if (!form.amount || !form.date) return;
    setTransactions(prev => [...prev, { ...form, id: Date.now(), amount: parseFloat(form.amount) }]);
    setForm({ type: 'expense', amount: '', category: 'Mad & Drikke', description: '', date: today(), recurring: false });
    setShowForm(false);
  };

  const addRecurringNow = () => {
    const next = currentMonth();
    let count = 0;
    transactions.filter(t => t.recurring).forEach(t => {
      const newDate = next + t.date.slice(7);
      if (!transactions.find(tx => tx.description === t.description && monthKey(tx.date) === next)) {
        setTransactions(prev => [...prev, { ...t, id: Date.now() + Math.random(), date: newDate }]);
        count++;
      }
    });
    alert(count + ' tilbagevendende transaktioner tilføjet!');
  };

  const deleteTransaction = (id) => setTransactions(prev => prev.filter(t => t.id !== id));

  const addGoal = () => {
    if (!goalForm.name || !goalForm.target) return;
    setGoals(prev => [...prev, { id: Date.now(), name: goalForm.name, target: parseFloat(goalForm.target), saved: parseFloat(goalForm.saved) || 0, color: COLORS[prev.length % COLORS.length], icon: goalForm.icon }]);
    setGoalForm({ name: '', target: '', saved: '', icon: '🎯' });
    setShowGoalForm(false);
  };

  const addToGoal = (id) => {
    const amt = parseFloat(addGoalAmount[id]);
    if (!amt) return;
    setGoals(prev => prev.map(g => g.id === id ? { ...g, saved: Math.min(g.saved + amt, g.target) } : g));
    setAddGoalAmount(prev => ({ ...prev, [id]: '' }));
  };

  const deleteGoal = (id) => setGoals(prev => prev.filter(g => g.id !== id));
  const removeFile = (idx) => setUploadedFiles(prev => prev.filter((_, i) => i !== idx));

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      let text = '';
      if (file.type === 'application/pdf') {
        try {
          const pdfjsLib = window.pdfjsLib;
          if (pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              text += content.items.map(item => item.str).join(' ') + '\n';
            }
          } else {
            text = 'PDF-læsning ikke tilgængelig. Prøv CSV format.';
          }
        } catch (err) {
          text = 'Fejl ved læsning af PDF: ' + err.message;
        }
      } else {
        text = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result);
          reader.readAsText(file);
        });
      }
      setUploadedFiles(prev => {
        if (prev.find(f => f.name === file.name)) return prev;
        return [...prev, { name: file.name, text }];
      });
    }
    e.target.value = '';
  };

  const callAI = async (messages) => {
    const res = await fetch('/.netlify/functions/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content[0].text;
  };

  const runAiAnalysis = async () => {
    if (!apiKey) return;
    setAiLoading(true);
    setAiError('');
    setAiAnalysis(null);
    const txSummary = transactions.map(t =>
      t.date + ' | ' + (t.type === 'income' ? 'Indtægt' : 'Udgift') + ' | ' + t.category + ' | ' + t.description + ' | ' + t.amount + ' kr'
    ).join('\n');
    const combinedFiles = uploadedFiles.map(f => '=== ' + f.name + ' ===\n' + f.text).join('\n\n');
    const dataSection = uploadedFiles.length > 0 ? combinedFiles.slice(0, 12000) : txSummary;
    const sourceDesc = uploadedFiles.length > 0
      ? 'kontoudtog fra ' + uploadedFiles.length + ' bank(er)'
      : 'transaktioner fra budgetappen';
    const prompt = 'Du er en dansk finansiel rådgiver. Analyser disse ' + sourceDesc + ' og identificér automatisk hvilken periode dataene dækker.\n\nData:\n' + dataSection + '\n\nGiv analyse i præcis dette JSON format uden ekstra tekst:\n{"overblik":"2-3 sætninger inkl periode","topUdgifter":[{"kategori":"...","beløb":0,"tip":"..."}],"styrker":["..."],"advarsler":["..."],"strategier":[{"titel":"...","beskrivelse":"...","besparelse":"..."}],"score":0}';
    try {
      const text = await callAI([{ role: 'user', content: prompt }]);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) setAiAnalysis(JSON.parse(match[0]));
      else setAiError('Kunne ikke parse AI svar — prøv igen');
    } catch (err) {
      setAiError('Fejl: ' + err.message);
    }
    setAiLoading(false);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !apiKey) return;
    const userMsg = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    const txSummary = transactions.map(t =>
      t.date + ' | ' + (t.type === 'income' ? 'Indtægt' : 'Udgift') + ' | ' + t.category + ' | ' + t.description + ' | ' + t.amount + ' kr'
    ).join('\n');
    const ctx = 'Du er en dansk personlig økonomi-assistent. Brugerens transaktioner:\n\n' + txSummary + '\n\nSvar kort og konkret på dansk med tal fra dataene.';
    try {
      const history = chatMessages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const reply = await callAI([
        { role: 'user', content: ctx },
        { role: 'assistant', content: 'Jeg har gennemgået dine transaktioner og er klar.' },
        ...history,
        userMsg,
      ]);
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Beklager, fejl: ' + err.message }]);
    }
    setChatLoading(false);
  };

  const importFromBank = () => {
    if (uploadedFiles.length === 0) return;
    let total = 0;
    const newTx = [];
    uploadedFiles.forEach(f => {
      const lines = f.text.split('\n').filter(l => l.trim());
      lines.forEach((line, i) => {
        if (i === 0) return;
        const parts = line.split(/[,;]/);
        if (parts.length >= 3) {
          const amount = parseFloat(parts[2]?.replace(/[^0-9.-]/g, ''));
          if (!isNaN(amount) && amount !== 0) {
            newTx.push({
              id: Date.now() + i + Math.random(),
              type: amount > 0 ? 'income' : 'expense',
              amount: Math.abs(amount),
              category: 'Andet',
              description: parts[1]?.trim() || 'Import',
              date: parts[0]?.trim() || today(),
              recurring: false,
            });
            total++;
          }
        }
      });
    });
    if (total > 0) { setTransactions(prev => [...prev, ...newTx]); alert(total + ' transaktioner importeret!'); }
    else alert('Ingen transaktioner fundet. Format: Dato, Beskrivelse, Beløb');
  };

  const CustomTooltip = ({ active, payload, label }) => active && payload?.length ? (
    <div style={{ background: '#1a2235', border: '1px solid #2d3f5e', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>{p.name}: {formatDKK(p.value)}</p>)}
    </div>
  ) : null;

  const PieTooltip = ({ active, payload }) => active && payload?.length ? (
    <div style={{ background: '#1a2235', border: '1px solid #2d3f5e', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill, fontSize: 13 }}>{formatDKK(payload[0].value)}</p>
    </div>
  ) : null;

  const DeltaBadge = ({ val }) => {
    if (val === null) return <span style={{ color: '#475569', fontSize: 11 }}>—</span>;
    const up = parseFloat(val) > 0;
    return <span style={{ color: up ? '#E8734A' : '#34D399', fontSize: 11, fontWeight: 700 }}>{up ? '▲' : '▼'} {Math.abs(val)}%</span>;
  };

  const renderMarkdown = (text) => {
    return text
      .split('\n')
      .map(line => {
        if (line.trim().startsWith('- ')) {
          return '<div style="padding-left:12px;margin:2px 0;">• ' + line.trim().slice(2) + '</div>';
        }
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
        return line ? '<div style="margin:2px 0;">' + line + '</div>' : '<div style="margin:4px 0;"></div>';
      })
      .join('');
  };

  const s = styles;

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div style={s.logo}><Wallet size={22} color="#D4A853" /><span style={s.logoText}>BudgetPro</span></div>
        <nav style={s.nav}>
          {[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'transaktioner', label: 'Transaktioner' },
            { key: 'mål', label: 'Mål' },
            { key: 'budget', label: '🎯 Budget' },
            { key: 'ai analyse', label: '🤖 AI' },
            { key: 'chat', label: '💬 Chat' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ ...s.navBtn, ...(activeTab === tab.key ? s.navBtnActive : {}) }}>
              {tab.label}
            </button>
          ))}
        </nav>
        <button onClick={() => setShowForm(true)} style={s.addBtn}><Plus size={16} /> Tilføj</button>
      </div>

      <div style={s.monthBar}>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={s.select}>
          {getLast12Months().map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      <div style={s.content}>

        {budgetAlerts.length > 0 && activeTab === 'dashboard' && (
          <div style={{ marginBottom: 16 }}>
            {budgetAlerts.map(a => (
              <div key={a.cat} style={{ background: a.p >= 100 ? '#2e1a0d' : '#1a2010', border: '1px solid ' + (a.p >= 100 ? '#E8734A' : '#D4A853'), borderRadius: 10, padding: '10px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{a.p >= 100 ? '🚨' : '⚠️'}</span>
                <span style={{ color: '#e2e8f0', fontSize: 13 }}>
                  <strong>{a.cat}</strong>: {formatDKK(a.spent)} af {formatDKK(a.limit)} ({a.p}%)
                  {a.p >= 100 ? ' — Budget overskredet!' : ' — Nærmer sig grænsen'}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            <div style={s.kpiRow}>
              <div style={{ ...s.kpi, borderColor: '#D4A853' }}><div style={s.kpiLabel}><ArrowUpCircle size={14} color="#D4A853" /> Indtægt</div><div style={{ ...s.kpiValue, color: '#D4A853' }}>{formatDKK(totalIncome)}</div></div>
              <div style={{ ...s.kpi, borderColor: '#E8734A' }}><div style={s.kpiLabel}><ArrowDownCircle size={14} color="#E8734A" /> Udgifter</div><div style={{ ...s.kpiValue, color: '#E8734A' }}>{formatDKK(totalExpense)}</div></div>
              <div style={{ ...s.kpi, borderColor: balance >= 0 ? '#34D399' : '#F87171' }}><div style={s.kpiLabel}><Wallet size={14} color={balance >= 0 ? '#34D399' : '#F87171'} /> Balance</div><div style={{ ...s.kpiValue, color: balance >= 0 ? '#34D399' : '#F87171' }}>{formatDKK(balance)}</div></div>
              <div style={{ ...s.kpi, borderColor: '#6B8CFF' }}><div style={s.kpiLabel}><TrendingUp size={14} color="#6B8CFF" /> Opsparingsrate</div><div style={{ ...s.kpiValue, color: '#6B8CFF' }}>{savingsRate}%</div></div>
            </div>

            {prevMonthTx.length > 0 && (
              <div style={s.card}>
                <h3 style={s.cardTitle}>📊 Måned til måned — {monthLabel(prevMonth)} vs {monthLabel(selectedMonth)}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'INDTÆGT', curr: totalIncome, prev: prevIncome, color: '#D4A853' },
                    { label: 'UDGIFTER', curr: totalExpense, prev: prevExpense, color: '#E8734A' },
                    { label: 'BALANCE', curr: balance, prev: prevBalance, color: balance >= 0 ? '#34D399' : '#F87171' },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#0d1520', borderRadius: 10, padding: 14 }}>
                      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>{item.label}</div>
                      <div style={{ color: item.color, fontWeight: 700, fontSize: 16 }}>{formatDKK(item.curr)}</div>
                      <DeltaBadge val={pct(item.curr, item.prev)} />
                    </div>
                  ))}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ color: '#475569', textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Kategori</th>
                      <th style={{ color: '#475569', textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>{monthLabel(prevMonth)}</th>
                      <th style={{ color: '#475569', textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>{monthLabel(selectedMonth)}</th>
                      <th style={{ color: '#475569', textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>Ændring</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthComparison.map(r => (
                      <tr key={r.cat} style={{ borderTop: '1px solid #1a2235' }}>
                        <td style={{ padding: '8px 0', color: '#e2e8f0' }}>{r.cat}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', color: '#64748b' }}>{r.prev > 0 ? formatDKK(r.prev) : '—'}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', color: '#e2e8f0' }}>{r.curr > 0 ? formatDKK(r.curr) : '—'}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}><DeltaBadge val={r.pctChange} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={s.chartsRow}>
              <div style={s.card}>
                <h3 style={s.cardTitle}>Månedsoversigt (seneste 6 måneder)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                    <XAxis dataKey="label" stroke="#4a6080" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis stroke="#4a6080" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => Math.round(v / 1000) + 'k'} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                    <Bar dataKey="Indtægt" fill="#D4A853" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Udgift" fill="#E8734A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={s.card}>
                <h3 style={s.cardTitle}>Udgiftsfordeling</h3>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={s.legend}>
                      {pieData.map((d, i) => (
                        <div key={d.name} style={s.legendItem}>
                          <span style={{ ...s.legendDot, background: COLORS[i % COLORS.length] }} />
                          <span style={s.legendLabel}>{d.name}</span>
                          <span style={s.legendVal}>{formatDKK(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div style={s.empty}>Ingen udgifter denne måned</div>}
              </div>
            </div>

            <div style={s.card}>
              <h3 style={s.cardTitle}>Seneste transaktioner</h3>
              {monthTx.slice(-6).reverse().map(t => (
                <div key={t.id} style={s.txRow}>
                  <div style={{ ...s.txDot, background: t.type === 'income' ? '#34D399' : '#E8734A' }} />
                  <div style={{ flex: 1 }}>
                    <div style={s.txDesc}>{t.description || t.category} {t.recurring && <span style={{ fontSize: 10, color: '#6B8CFF', marginLeft: 4 }}>🔄</span>}</div>
                    <div style={s.txMeta}>{t.category} · {t.date}</div>
                  </div>
                  <div style={{ ...s.txAmt, color: t.type === 'income' ? '#34D399' : '#E8734A' }}>{t.type === 'income' ? '+' : '-'}{formatDKK(t.amount)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'transaktioner' && (
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={s.cardTitle}>Alle transaktioner</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={s.badge}>{monthTx.length} poster</span>
                <button onClick={addRecurringNow} style={{ ...s.addBtn, fontSize: 12, padding: '6px 12px' }}><RefreshCw size={12} /> Tilbagevendende</button>
              </div>
            </div>
            {monthTx.length === 0 && <div style={s.empty}>Ingen transaktioner denne måned</div>}
            {monthTx.sort((a, b) => b.date.localeCompare(a.date)).map(t => (
              <div key={t.id} style={s.txRow}>
                <div style={{ ...s.txDot, background: t.type === 'income' ? '#34D399' : '#E8734A' }} />
                <div style={{ flex: 1 }}>
                  <div style={s.txDesc}>{t.description || t.category} {t.recurring && <span style={{ fontSize: 10, color: '#6B8CFF' }}>🔄</span>}</div>
                  <div style={s.txMeta}>{t.category} · {t.date}</div>
                </div>
                <div style={{ ...s.txAmt, color: t.type === 'income' ? '#34D399' : '#E8734A' }}>{t.type === 'income' ? '+' : '-'}{formatDKK(t.amount)}</div>
                <button onClick={() => deleteTransaction(t.id)} style={s.delBtn}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'mål' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => setShowGoalForm(true)} style={s.addBtn}><Plus size={16} /> Nyt mål</button>
            </div>
            <div style={s.kpiRow}>
              <div style={{ ...s.kpi, borderColor: '#D4A853' }}><div style={s.kpiLabel}><Target size={14} color="#D4A853" /> Aktive mål</div><div style={{ ...s.kpiValue, color: '#D4A853' }}>{goals.length}</div></div>
              <div style={{ ...s.kpi, borderColor: '#4ECDC4' }}><div style={s.kpiLabel}><TrendingUp size={14} color="#4ECDC4" /> Samlet opsparet</div><div style={{ ...s.kpiValue, color: '#4ECDC4' }}>{formatDKK(goals.reduce((s, g) => s + g.saved, 0))}</div></div>
              <div style={{ ...s.kpi, borderColor: '#A78BFA' }}><div style={s.kpiLabel}><Target size={14} color="#A78BFA" /> Samlet målsum</div><div style={{ ...s.kpiValue, color: '#A78BFA' }}>{formatDKK(goals.reduce((s, g) => s + g.target, 0))}</div></div>
            </div>
            <div style={s.goalsGrid}>
              {goals.map(g => {
                const p = Math.min((g.saved / g.target) * 100, 100);
                return (
                  <div key={g.id} style={{ ...s.goalCard, borderColor: g.color + '44' }}>
                    <div style={s.goalHeader}>
                      <span style={s.goalIcon}>{g.icon}</span>
                      <div style={{ flex: 1 }}><div style={s.goalName}>{g.name}</div><div style={s.goalMeta}>{formatDKK(g.saved)} af {formatDKK(g.target)}</div></div>
                      <button onClick={() => deleteGoal(g.id)} style={s.delBtn}><Trash2 size={14} /></button>
                    </div>
                    <div style={s.progressTrack}><div style={{ ...s.progressBar, width: p + '%', background: g.color }} /></div>
                    <div style={s.goalStats}>
                      <span style={{ color: g.color, fontWeight: 700 }}>{p.toFixed(1)}%</span>
                      <span style={{ color: '#64748b' }}>Mangler {formatDKK(g.target - g.saved)}</span>
                    </div>
                    <div style={s.goalActions}>
                      <input type="number" placeholder="Tilføj beløb..." value={addGoalAmount[g.id] || ''} onChange={e => setAddGoalAmount(prev => ({ ...prev, [g.id]: e.target.value }))} style={s.goalInput} />
                      <button onClick={() => addToGoal(g.id)} style={{ ...s.goalBtn, background: g.color }}><Plus size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'budget' && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>Budgetgrænser per kategori</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Sæt månedlige grænser og få advarsler når du nærmer dig dem.</p>
            {CATEGORIES.expense.map(cat => {
              const spent = categorySpend[cat] || 0;
              const limit = budgets[cat] || 0;
              const p = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
              const color = p >= 100 ? '#E8734A' : p >= 80 ? '#D4A853' : '#34D399';
              return (
                <div key={cat} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                    <span style={{ color: '#e2e8f0', fontSize: 14 }}>{cat}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: color, fontSize: 13, fontWeight: 600 }}>{formatDKK(spent)}</span>
                      <span style={{ color: '#475569', fontSize: 12 }}>af</span>
                      <input
                        type="number"
                        value={budgets[cat] || ''}
                        onChange={e => setBudgets(prev => ({ ...prev, [cat]: parseFloat(e.target.value) || 0 }))}
                        style={{ ...s.goalInput, width: 90, textAlign: 'right' }}
                        placeholder="Grænse..."
                      />
                      <span style={{ color: '#475569', fontSize: 12 }}>kr</span>
                    </div>
                  </div>
                  {limit > 0 && (
                    <div style={s.progressTrack}>
                      <div style={{ ...s.progressBar, width: p + '%', background: color }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'ai analyse' && (
          <>
            <div style={{ ...s.card, borderColor: '#D4A85344' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Key size={16} color="#D4A853" />
                <h3 style={{ ...s.cardTitle, margin: 0 }}>Anthropic API Nøgle</h3>
                {apiKey && <span style={{ background: '#0d2e1e', color: '#34D399', borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>✓ Gemt</span>}
              </div>
              <input type="password" placeholder="sk-ant-..." value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
              <p style={{ color: '#475569', fontSize: 11, marginTop: 8 }}>Opret gratis nøgle på console.anthropic.com</p>
            </div>

            <div style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Upload size={16} color="#4ECDC4" />
                <h3 style={{ ...s.cardTitle, margin: 0 }}>Upload kontoudtog — {uploadedFiles.length > 0 ? uploadedFiles.length + ' fil(er) indlæst' : 'CSV eller PDF'}</h3>
              </div>
              {uploadedFiles.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {uploadedFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0d1520', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                      <span>📄</span>
                      <span style={{ flex: 1, color: '#e2e8f0', fontSize: 13 }}>{f.name}</span>
                      <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ border: '2px dashed #2d3f5e', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <input type="file" accept=".csv,.txt,.pdf" onChange={handleFileUpload} style={{ display: 'none' }} id="fileInput" multiple />
                <label htmlFor="fileInput" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Upload size={24} color="#4ECDC4" />
                  <span style={{ color: '#94a3b8', fontSize: 14 }}>Klik for at tilføje filer</span>
                  <span style={{ color: '#475569', fontSize: 11 }}>Understøtter CSV og PDF fra flere banker</span>
                </label>
              </div>
              {uploadedFiles.length > 0 && (
                <button onClick={importFromBank} style={{ ...s.confirmBtn, width: '100%', marginTop: 12, padding: '10px 0' }}>
                  📥 Importér transaktioner
                </button>
              )}
            </div>

            <button onClick={runAiAnalysis} disabled={aiLoading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg, #6B8CFF, #A78BFA)', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer', marginBottom: 16, opacity: aiLoading ? 0.7 : 1 }}>
              <Brain size={18} />{aiLoading ? 'Analyserer din økonomi...' : '🤖 Analysér med AI'}
            </button>

            {aiError && <div style={{ background: '#2e1a0d', border: '1px solid #E8734A', borderRadius: 12, padding: 16, marginBottom: 16, color: '#E8734A', fontSize: 13 }}>⚠️ {aiError}</div>}

            {aiAnalysis && (
              <>
                <div style={{ ...s.card, borderColor: '#D4A85344' }}>
                  <div style={{ textAlign: 'center' as const, marginBottom: 12 }}>
                    <div style={{ fontSize: 48, fontWeight: 800, color: aiAnalysis.score >= 70 ? '#34D399' : aiAnalysis.score >= 50 ? '#D4A853' : '#E8734A' }}>{aiAnalysis.score}/100</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>Din finansielle sundhedsscore</div>
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.6, textAlign: 'left' as const }}>{aiAnalysis.overblik}</p>
                </div>
                <div style={s.chartsRow}>
                  <div style={{ ...s.card, borderColor: '#34D39944', textAlign: 'left' }}>
                    <h3 style={{ ...s.cardTitle, color: '#34D399' }}>✅ Styrker</h3>
                    {aiAnalysis.styrker?.map((str, i) => <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 13, color: '#e2e8f0', textAlign: 'left' }}><span style={{ color: '#34D399', flexShrink: 0 }}>•</span><span>{str}</span></div>)}
                  </div>
                  <div style={{ ...s.card, borderColor: '#E8734A44', textAlign: 'left' }}>
                    <h3 style={{ ...s.cardTitle, color: '#E8734A' }}>⚠️ Opmærksomhed</h3>
                    {aiAnalysis.advarsler?.map((a, i) => <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 13, color: '#e2e8f0', textAlign: 'left' }}><span style={{ color: '#E8734A', flexShrink: 0 }}>•</span><span>{a}</span></div>)}
                  </div>
                </div>
                <div style={s.card}>
                  <h3 style={{ ...s.cardTitle, color: '#6B8CFF' }}>🚀 Vækststrategier</h3>
                  <div style={s.goalsGrid}>
                    {aiAnalysis.strategier?.map((strat, i) => (
                      <div key={i} style={{ background: '#0d1520', border: '1px solid #2d3f5e', borderRadius: 12, padding: 16 }}>
                        <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>{strat.titel}</div>
                        <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>{strat.beskrivelse}</div>
                        {strat.besparelse && <div style={{ color: '#34D399', fontSize: 12, fontWeight: 600 }}>💰 {strat.besparelse}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'chat' && (
          <div style={{ ...s.card, display: 'flex', flexDirection: 'column', height: 600 }}>
            <h3 style={{ ...s.cardTitle, textAlign: "left" as const }}>💬 Chat med din økonomi</h3>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                  <div
                    style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: 12, background: m.role === 'user' ? '#6B8CFF' : '#1a2235', color: '#e2e8f0', fontSize: 14, lineHeight: 1.6, textAlign: 'left' }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                  />
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                  <div style={{ background: '#1a2235', padding: '10px 14px', borderRadius: 12, color: '#64748b', fontSize: 14 }}>Tænker...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Stil et spørgsmål om din økonomi..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                style={{ ...s.input, flex: 1 }}
              />
              <button onClick={sendChatMessage} disabled={chatLoading} style={{ ...s.addBtn, padding: '8px 16px' }}>
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#e2e8f0', marginBottom: 20 }}>Tilføj transaktion</h3>
            <div style={s.typeToggle}>
              <button onClick={() => setForm(f => ({ ...f, type: 'income', category: 'Løn' }))} style={{ ...s.typeBtn, ...(form.type === 'income' ? s.typeBtnIncomeActive : {}) }}><ArrowUpCircle size={15} /> Indtægt</button>
              <button onClick={() => setForm(f => ({ ...f, type: 'expense', category: 'Mad & Drikke' }))} style={{ ...s.typeBtn, ...(form.type === 'expense' ? s.typeBtnExpenseActive : {}) }}><ArrowDownCircle size={15} /> Udgift</button>
            </div>
            <div style={s.field}><label style={s.label}>Beløb (DKK)</label><input type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={s.input} /></div>
            <div style={s.field}><label style={s.label}>Kategori</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={s.input}>
                {CATEGORIES[form.type].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={s.field}><label style={s.label}>Beskrivelse</label><input type="text" placeholder="Valgfri..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={s.input} /></div>
            <div style={s.field}><label style={s.label}>Dato</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={s.input} /></div>
            <div style={s.field}>
              <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none' }}>
                <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} />
                Tilbagevendende transaktion 🔄
              </label>
            </div>
            <div style={s.modalBtns}>
              <button onClick={() => setShowForm(false)} style={s.cancelBtn}>Annuller</button>
              <button onClick={addTransaction} style={s.confirmBtn}>Gem transaktion</button>
            </div>
          </div>
        </div>
      )}

      {showGoalForm && (
        <div style={s.overlay} onClick={() => setShowGoalForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#e2e8f0', marginBottom: 20 }}>Nyt opsparingsmål</h3>
            <div style={s.field}>
              <label style={s.label}>Ikon</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['🎯','✈️','🏠','🚗','💻','🛡️','💍','🎓','🌍','📱'].map(ico => (
                  <button key={ico} onClick={() => setGoalForm(f => ({ ...f, icon: ico }))} style={{ ...s.iconBtn, ...(goalForm.icon === ico ? s.iconBtnActive : {}) }}>{ico}</button>
                ))}
              </div>
            </div>
            <div style={s.field}><label style={s.label}>Navn</label><input type="text" placeholder="f.eks. Sommerferie" value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} style={s.input} /></div>
            <div style={s.field}><label style={s.label}>Målbeløb (DKK)</label><input type="number" placeholder="0" value={goalForm.target} onChange={e => setGoalForm(f => ({ ...f, target: e.target.value }))} style={s.input} /></div>
            <div style={s.field}><label style={s.label}>Allerede opsparet (DKK)</label><input type="number" placeholder="0" value={goalForm.saved} onChange={e => setGoalForm(f => ({ ...f, saved: e.target.value }))} style={s.input} /></div>
            <div style={s.modalBtns}>
              <button onClick={() => setShowGoalForm(false)} style={s.cancelBtn}>Annuller</button>
              <button onClick={addGoal} style={s.confirmBtn}>Opret mål</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { minHeight: '100vh', background: '#0d1520', fontFamily: 'sans-serif', color: '#e2e8f0' },
  header: { display: 'flex', alignItems: 'center', gap: 20, padding: '16px 24px', borderBottom: '1px solid #1e2d45', background: '#0d1520', position: 'sticky' as const, top: 0, zIndex: 100 },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 18, color: '#D4A853', fontWeight: 700 },
  nav: { display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' as const },
  navBtn: { background: 'none', border: 'none', color: '#64748b', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  navBtnActive: { background: '#1a2235', color: '#D4A853' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#D4A853', color: '#0d1520', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  monthBar: { padding: '12px 24px', borderBottom: '1px solid #1a2235' },
  select: { background: '#1a2235', border: '1px solid #2d3f5e', color: '#e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 13 },
  content: { padding: 24, maxWidth: 1100, margin: '0 auto' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 },
  kpi: { background: '#111e2e', border: '1px solid transparent', borderLeftWidth: 3, borderRadius: 12, padding: '16px 20px' },
  kpiLabel: { display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  kpiValue: { fontSize: 22, fontWeight: 800 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  card: { background: '#111e2e', border: '1px solid #1e2d45', borderRadius: 12, padding: 20, marginBottom: 16 },
  cardTitle: { color: '#94a3b8', fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 16px 0' },
  legend: { display: 'flex', flexDirection: 'column' as const, gap: 6, marginTop: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 },
  legendDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  legendLabel: { flex: 1, color: '#94a3b8' },
  legendVal: { color: '#e2e8f0', fontWeight: 600 },
  txRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1a2235' },
  txDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  txDesc: { fontSize: 14, color: '#e2e8f0', fontWeight: 500 },
  txMeta: { fontSize: 11, color: '#475569', marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: 700, fontFamily: 'monospace' },
  delBtn: { background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  badge: { background: '#1a2235', color: '#64748b', borderRadius: 20, padding: '3px 10px', fontSize: 12 },
  empty: { color: '#334155', textAlign: 'center' as const, padding: '30px 0', fontSize: 14 },
  goalsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 },
  goalCard: { background: '#111e2e', border: '1px solid', borderRadius: 12, padding: 20 },
  goalHeader: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  goalIcon: { fontSize: 24 },
  goalName: { fontSize: 15, fontWeight: 700, color: '#e2e8f0' },
  goalMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  progressTrack: { background: '#1a2235', borderRadius: 100, height: 8, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', borderRadius: 100, transition: 'width .5s ease' },
  goalStats: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 12 },
  goalActions: { display: 'flex', gap: 8 },
  goalInput: { flex: 1, background: '#1a2235', border: '1px solid #2d3f5e', color: '#e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 13 },
  goalBtn: { border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0d1520', fontWeight: 700 },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#111e2e', border: '1px solid #2d3f5e', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 },
  typeToggle: { display: 'flex', gap: 8, marginBottom: 20 },
  typeBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1a2235', border: '1px solid #2d3f5e', color: '#64748b', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  typeBtnIncomeActive: { background: '#0d2e1e', borderColor: '#34D399', color: '#34D399' },
  typeBtnExpenseActive: { background: '#2e1a0d', borderColor: '#E8734A', color: '#E8734A' },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  input: { width: '100%', boxSizing: 'border-box' as const, background: '#1a2235', border: '1px solid #2d3f5e', color: '#e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 14 },
  modalBtns: { display: 'flex', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, background: 'none', border: '1px solid #2d3f5e', color: '#64748b', borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontSize: 14 },
  confirmBtn: { flex: 1, background: '#D4A853', border: 'none', color: '#0d1520', borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontSize: 14, fontWeight: 700 },
  iconBtn: { background: '#1a2235', border: '1px solid #2d3f5e', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 18 },
  iconBtnActive: { background: '#2d3f5e', borderColor: '#D4A853' },
};
