import { useState, useRef, useEffect, useCallback } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

/* ═══════════════════════════════════════════
   FINANCIAL CALCULATION ENGINE
═══════════════════════════════════════════ */
const fmt = (n) => {
  if (n >= 1_000_000) return "₹" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "₹" + (n / 1_000).toFixed(1) + "K";
  return "₹" + Math.round(n);
};
const pct = (n) => (n * 100).toFixed(1) + "%";

function calcMetrics(p) {
  const totalDebt = p.ccDebt + p.studentDebt + p.personalDebt + p.homeDebt;
  const netSavings = p.income - p.expenses;
  const dtiRatio = p.income > 0 ? totalDebt / (p.income * 12) : 0;
  const savingsRate = p.income > 0 ? p.savings / p.income : 0;
  const efMonths = p.expenses > 0 ? p.emergencyFund / p.expenses : 0;
  const needsPct = p.income > 0 ? p.expenses / p.income : 0;
  let score = 50;
  score += Math.min(20, savingsRate * 100);
  score += Math.min(20, (efMonths / 6) * 20);
  score += Math.max(0, 15 - dtiRatio * 41.67);
  if (needsPct < 0.5) score += 10;
  else if (needsPct < 0.7) score += 5;
  if (p.investments > 0) score += 5;
  score = Math.min(100, Math.max(0, Math.round(score)));
  return {
    totalDebt, netSavings, dtiRatio, savingsRate, efMonths, needsPct, score,
    scoreLabel: score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : "Needs Work",
    scoreColor: score >= 80 ? "#2dd4a0" : score >= 65 ? "#c9a84c" : score >= 50 ? "#4a9eff" : "#ff5a7d",
  };
}

function monteCarlo(monthlyContrib, years, simCount = 400) {
  const scenarios = { conservative: 0.04, moderate: 0.07, aggressive: 0.10 };
  const results = {};
  Object.entries(scenarios).forEach(([name, annualReturn]) => {
    const monthlyRate = annualReturn / 12;
    const months = years * 12;
    let runs = [];
    for (let s = 0; s < simCount; s++) {
      let balance = 0;
      for (let m = 0; m < months; m++) {
        const noise = 1 + (Math.random() - 0.5) * 0.08;
        balance = (balance + monthlyContrib) * (1 + monthlyRate * noise);
      }
      runs.push(balance);
    }
    runs.sort((a, b) => a - b);
    results[name] = { median: runs[Math.floor(simCount * 0.5)], p25: runs[Math.floor(simCount * 0.25)], p75: runs[Math.floor(simCount * 0.75)] };
  });
  return results;
}

function calcDebtPayoff(p) {
  const debts = [
    { name: "Credit Card", balance: p.ccDebt, rate: 0.36 },
    { name: "Personal Loan", balance: p.personalDebt, rate: 0.18 },
    { name: "Student Loan", balance: p.studentDebt, rate: 0.10 },
    { name: "Home Loan", balance: p.homeDebt, rate: 0.085 },
  ].filter((d) => d.balance > 0);
  if (!debts.length) return null;
  const extra = p.savings * 0.3;
  function simulate(strategy) {
    let ds = debts.map((d) => ({ ...d }));
    if (strategy === "avalanche") ds.sort((a, b) => b.rate - a.rate);
    else ds.sort((a, b) => a.balance - b.balance);
    const minPay = ds.map((d) => Math.max(d.balance * 0.02, 500));
    let totalInterest = 0, months = 0;
    while (ds.some((d) => d.balance > 0) && months < 600) {
      months++;
      let ex = extra;
      ds.forEach((d, i) => {
        if (d.balance <= 0) return;
        const interest = d.balance * (d.rate / 12);
        totalInterest += interest;
        d.balance += interest;
        d.balance -= Math.min(d.balance, minPay[i]);
      });
      const target = ds.find((d) => d.balance > 0);
      if (target) { const pay = Math.min(target.balance, ex); target.balance -= pay; if (target.balance <= 0) target.balance = 0; }
    }
    return { months, totalInterest };
  }
  return { avalanche: simulate("avalanche"), snowball: simulate("snowball"), debts };
}

/* ═══════════════════════════════════════════
   CLAUDE API — artifact built-in (no CORS)
═══════════════════════════════════════════ */
async function askClaude(messages, systemPrompt) {
  
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`  // ← paste your Groq key
  },
  body: JSON.stringify({
    model: "llama-3.3-70b-versatile",
    messages: messages,
    max_tokens: 400
  })
});

if (!response.ok) {
  const err = await response.json().catch(() => ({}));
  throw new Error(err?.error?.message || "API error " + response.status);
}
const data = await response.json();
return data.choices[0].message.content;  // ✅ fixed
}

/* ═══════════════════════════════════════════
   STYLES (inline)
═══════════════════════════════════════════ */
const C = {
  bg: "#07090f", bg2: "#0c0f1a", bg3: "#111627",
  panel: "#131826", panel2: "#171d2e",
  border: "#1e2740", border2: "#263352",
  gold: "#c9a84c", gold2: "#e8c870", goldDim: "rgba(201,168,76,0.12)",
  blue: "#4a9eff", green: "#2dd4a0", red: "#ff5a7d", purple: "#8b5cf6",
  text: "#e2e8f4", text2: "#8fa3c8", text3: "#4a6088",
};

/* ═══════════════════════════════════════════
   MINI COMPONENTS
═══════════════════════════════════════════ */
function Field({ label, id, value, onChange, type = "number", placeholder = "", options }) {
  const base = { width: "100%", padding: "8px 11px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontFamily: "inherit", fontSize: "0.82rem", outline: "none" };
  if (options) return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: "0.7rem", color: C.text2, marginBottom: 4 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...base, appearance: "none" }}>
        <option value="">Select...</option>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: "0.7rem", color: C.text2, marginBottom: 4 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} />
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 4 }}>
      <span style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold, whiteSpace: "nowrap" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function MetricCard({ label, value, status }) {
  const color = status === "good" ? C.green : status === "warn" ? C.gold : status === "bad" ? C.red : C.text;
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: "0.6rem", color: C.text3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.9rem", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function ScoreRing({ score, label, color }) {
  const r = 38, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ textAlign: "center", padding: "14px 0 10px" }}>
      <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 8px" }}>
        <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="45" cy="45" r={r} fill="none" stroke={C.border} strokeWidth="6" />
          <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',monospace", fontSize: "1.3rem", fontWeight: 800, color: C.text }}>{score}</div>
      </div>
      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.68rem", fontWeight: 700, color, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "0.68rem", color: C.text2, marginTop: 2 }}>Financial Health Score</div>
    </div>
  );
}

function BudgetBar({ label, value, target, color }) {
  const w = Math.min(100, value);
  const ok = target === "max" ? value <= 50 : value >= 20;
  const warn = target === "max" ? value <= 65 : value >= 10;
  const barColor = ok ? C.green : warn ? C.gold : C.red;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", color: C.text2, marginBottom: 4 }}>
        <span>{label}</span><span style={{ fontFamily: "monospace", color: C.text }}>{value.toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, background: C.bg3, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, background: barColor, borderRadius: 3, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function ChatBubble({ msg }) {
  const isUser = msg.role === "user";
  const lines = msg.content.split("\n");
  const formatted = lines.map((line, i) => {
    if (line.startsWith("### ")) return <div key={i} style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.75rem", color: C.gold, margin: "12px 0 5px", letterSpacing: "0.05em" }}>{line.slice(4)}</div>;
    if (line.startsWith("## "))  return <div key={i} style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.8rem", color: C.gold2, margin: "10px 0 4px" }}>{line.slice(3)}</div>;
    const parts = line.split(/(\*\*.*?\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={j} style={{ color: C.gold2 }}>{p.slice(2, -2)}</strong>
        : p
    );
    if (line.startsWith("- ") || line.startsWith("• "))
      return <div key={i} style={{ display: "flex", gap: 6, marginBottom: 3 }}><span style={{ color: C.gold, flexShrink: 0 }}>•</span><span>{parts.slice(1)}</span></div>;
    if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
    return <div key={i} style={{ marginBottom: 2 }}>{parts}</div>;
  });
  return (
    <div style={{ display: "flex", gap: 10, alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "85%", flexDirection: isUser ? "row-reverse" : "row", animation: "fadeUp 0.3s ease" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',monospace", fontSize: "0.55rem", fontWeight: 800, background: isUser ? C.panel2 : `linear-gradient(135deg,${C.goldDim},rgba(74,158,255,0.15))`, border: `1px solid ${isUser ? C.border : C.border2}`, color: isUser ? C.text2 : C.gold }}>
        {isUser ? "YOU" : "WM"}
      </div>
      <div style={{ padding: "12px 16px", borderRadius: 12, background: isUser ? C.panel2 : C.panel, border: `1px solid ${isUser ? C.border2 : C.border}`, fontSize: "0.85rem", lineHeight: 1.7, color: C.text, borderTopRightRadius: isUser ? 3 : 12, borderTopLeftRadius: isUser ? 12 : 3 }}>
        {formatted}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 10, alignSelf: "flex-start" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',monospace", fontSize: "0.55rem", fontWeight: 800, background: `linear-gradient(135deg,${C.goldDim},rgba(74,158,255,0.15))`, border: `1px solid ${C.border2}`, color: C.gold }}>WM</div>
      <div style={{ padding: "14px 18px", borderRadius: 12, borderTopLeftRadius: 3, background: C.panel, border: `1px solid ${C.border}`, display: "flex", gap: 5, alignItems: "center" }}>
        {[0, 0.2, 0.4].map((d, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.text3, animation: `bounce 0.9s ${d}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD CHARTS
═══════════════════════════════════════════ */
function ChartCard({ title, dot, children }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${C.gold},transparent)`, opacity: 0.5 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
        <span style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text2 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

const TOOLTIP_STYLE = { backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: "0.75rem", color: C.text };
const TICK_STYLE = { fontSize: 10, fill: C.text2 };

/* ═══════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════ */
export default function WealthMind() {
  // Profile state
  const [profile, setProfile] = useState({
    income: "", expenses: "", savings: "", investments: "", emergencyFund: "",
    ccDebt: "", studentDebt: "", personalDebt: "", homeDebt: "",
    goal: "", goalAmount: "", goalYears: "", age: "", riskTolerance: "",
  });
  const set = (k) => (v) => setProfile(p => ({ ...p, [k]: v }));

  // UI state
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [convHistory, setConvHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEnd = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const getP = useCallback(() => ({
    income: +profile.income || 0, expenses: +profile.expenses || 0,
    savings: +profile.savings || 0, investments: +profile.investments || 0,
    emergencyFund: +profile.emergencyFund || 0, ccDebt: +profile.ccDebt || 0,
    studentDebt: +profile.studentDebt || 0, personalDebt: +profile.personalDebt || 0,
    homeDebt: +profile.homeDebt || 0, goal: profile.goal,
    goalAmount: +profile.goalAmount || 0, goalYears: +profile.goalYears || 5,
    age: +profile.age || 25, riskTolerance: profile.riskTolerance,
  }), [profile]);

  const buildSystem = useCallback(() => {
    const p = getP(); const m = calcMetrics(p);
    return `You are WealthMind, an expert AI personal finance advisor with deep expertise in financial planning, debt management, investment strategy, and risk assessment — similar to tools used at JP Morgan and Goldman Sachs.

USER'S FINANCIAL PROFILE:
- Monthly Income: ${fmt(p.income)} | Expenses: ${fmt(p.expenses)} | Savings: ${fmt(p.savings)}
- Investments: ${fmt(p.investments)} | Emergency Fund: ${fmt(p.emergencyFund)} (${m.efMonths.toFixed(1)} months)
- Debt: CC ${fmt(p.ccDebt)} | Student ${fmt(p.studentDebt)} | Personal ${fmt(p.personalDebt)} | Home ${fmt(p.homeDebt)}
- Total Debt: ${fmt(m.totalDebt)} | DTI: ${pct(m.dtiRatio)} | Savings Rate: ${pct(m.savingsRate)}
- Health Score: ${m.score}/100 (${m.scoreLabel}) | Risk: ${p.riskTolerance || "Not set"}
- Goal: ${p.goal || "Not set"} — ${fmt(p.goalAmount)} in ${p.goalYears} years | Age: ${p.age}

INSTRUCTIONS: Give precise, calculated, actionable advice using their ACTUAL numbers. Use ### for headers, **bold** for key figures. Reference real financial principles (50/30/20, Avalanche/Snowball, compound interest). Be direct like a private wealth manager. Keep under 350 words unless detailed analysis requested.`;
  }, [getP]);

  const sendMessage = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    const newHistory = [...convHistory, { role: "user", content: msg }];
    try {
      const reply = await askClaude(newHistory, buildSystem());
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setConvHistory([...newHistory, { role: "assistant", content: reply }].slice(-20));
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `### Error\n\n${e.message}\n\nPlease try again.` }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  }, [input, loading, convHistory, buildSystem]);

  const runAnalysis = useCallback(() => {
    const p = getP();
    if (!p.income) { alert("Please enter your monthly income first."); return; }
    const m = calcMetrics(p);
    setMetrics(m);
    setAnalyzed(true);
    setSidebarOpen(false);
    setTab("chat");
    sendMessage("Run a complete financial health analysis on my profile. Give me my key strengths, critical weaknesses, and top 3 priority actions with specific numbers and timelines.");
  }, [getP, sendMessage]);

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  // ── Computed chart data ──
  const p = getP();
  const m = metrics || calcMetrics(p);
  const needsPct = p.income > 0 ? (p.expenses / p.income) * 100 : 0;
  const wantsPct = p.income > 0 ? Math.max(0, ((p.income - p.expenses - p.savings) / p.income) * 100) : 0;
  const savPct   = p.income > 0 ? (p.savings / p.income) * 100 : 0;
  const netWorth = p.investments + p.emergencyFund - m.totalDebt;

  const allocData = [
    { name: "Needs",   value: p.expenses, color: C.blue },
    { name: "Wants",   value: Math.max(0, p.income - p.expenses - p.savings), color: C.red },
    { name: "Savings", value: p.savings, color: C.green },
  ].filter(d => d.value > 0);

  const netWorthData = [
    { name: "Investments", value: p.investments, fill: C.blue },
    { name: "Emerg. Fund", value: p.emergencyFund, fill: C.green },
    { name: "Total Debt",  value: m.totalDebt, fill: C.red },
    { name: "Net Worth",   value: netWorth, fill: netWorth >= 0 ? C.gold : C.red },
  ];

  const mcResult = analyzed && p.savings > 0 ? monteCarlo(p.savings, p.goalYears || 5) : null;
  const goalLines = mcResult ? Array.from({ length: (p.goalYears || 5) + 1 }, (_, yr) => {
    function project(rate) {
      let bal = 0;
      for (let y = 0; y < yr; y++) for (let mo = 0; mo < 12; mo++) bal = (bal + p.savings) * (1 + rate / 12);
      return Math.round(bal);
    }
    return { year: `Yr ${yr}`, conservative: project(0.04), moderate: project(0.07), aggressive: project(0.10), goal: p.goalAmount || 0 };
  }) : [];

  const debtResult = analyzed ? calcDebtPayoff(p) : null;

  const recs = [];
  if (m.efMonths < 3)     recs.push({ icon: "🚨", t: "Build Emergency Fund", s: `Only ${m.efMonths.toFixed(1)} months covered. Target: ${fmt(p.expenses * 6)}` });
  if (m.savingsRate < 0.1) recs.push({ icon: "📈", t: "Increase Savings Rate", s: `Saving ${pct(m.savingsRate)}. Target 20% = ${fmt(p.income * 0.2)}/mo` });
  if (p.ccDebt > 0)        recs.push({ icon: "💳", t: "Clear Credit Card Debt", s: `${fmt(p.ccDebt)} at ~36% p.a. — highest priority` });
  if (m.dtiRatio > 0.36)   recs.push({ icon: "⚠️", t: "High Debt-to-Income", s: `DTI ${pct(m.dtiRatio)} exceeds 36% safe threshold` });
  if (p.investments === 0) recs.push({ icon: "💹", t: "Start Investing", s: `No investments recorded. Start with index funds.` });
  if (recs.length === 0)   recs.push({ icon: "🏆", t: "Excellent Profile!", s: "Strong fundamentals. Focus on maximising returns." });

  // ── Styles ──
  const sidebarStyle = {
    background: C.bg2, borderRight: `1px solid ${C.border}`,
    overflowY: "auto", overflowX: "hidden", flexShrink: 0,
    width: 280, display: "flex", flexDirection: "column",
  };

  const TABS = ["chat", "dashboard", "debt", "goals"];
  const TAB_LABELS = { chat: "💬 AI Advisor", dashboard: "📊 Dashboard", debt: "💳 Debt Plan", goals: "🎯 Goals" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;800;900&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border2}; border-radius: 3px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        @keyframes bounce { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-6px); } }
        input:focus, select:focus, textarea:focus { border-color: ${C.gold} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.12) !important; outline: none; }
        input::placeholder, textarea::placeholder { color: ${C.text3}; }
        option { background: ${C.panel}; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans',sans-serif", background: C.bg, color: C.text, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── TOPBAR ── */}
        <header style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "rgba(7,9,15,0.95)", borderBottom: `1px solid ${C.border}`, flexShrink: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: `linear-gradient(135deg,${C.gold},${C.gold2})`, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',monospace", fontSize: "0.65rem", fontWeight: 800, color: "#000" }}>WM</div>
            <span style={{ fontFamily: "'Orbitron',monospace", fontWeight: 800, fontSize: "0.95rem" }}>Wealth<span style={{ color: C.gold }}>Mind</span></span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.55rem", color: C.text3, padding: "2px 8px", border: `1px solid ${C.border}`, borderRadius: 20 }}>AI Finance Advisor</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setSidebarOpen(s => !s)} style={{ display: "none", padding: "5px 12px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text2, fontSize: "0.72rem", cursor: "pointer", "@media(max-width:768px)": { display: "flex" } }}>⚙ Profile</button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", color: C.text3 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}`, animation: "bounce 2s infinite" }} />
              POWERED BY CLAUDE AI
            </div>
          </div>
        </header>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr", minHeight: 0, overflow: "hidden" }}>

          {/* ── SIDEBAR ── */}
          <aside style={sidebarStyle}>
            <div style={{ padding: 16, overflowY: "auto" }}>

              <SectionTitle>Financial Profile</SectionTitle>
              <Field label="Monthly Income (₹)" value={profile.income} onChange={set("income")} placeholder="e.g. 80000" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="Expenses" value={profile.expenses} onChange={set("expenses")} placeholder="45000" />
                <Field label="Savings" value={profile.savings} onChange={set("savings")} placeholder="15000" />
              </div>
              <Field label="Total Investments" value={profile.investments} onChange={set("investments")} placeholder="200000" />
              <Field label="Emergency Fund" value={profile.emergencyFund} onChange={set("emergencyFund")} placeholder="50000" />

              <SectionTitle>Debt Profile</SectionTitle>
              <Field label="Credit Card Debt" value={profile.ccDebt} onChange={set("ccDebt")} placeholder="0" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="Student Loan" value={profile.studentDebt} onChange={set("studentDebt")} placeholder="0" />
                <Field label="Personal Loan" value={profile.personalDebt} onChange={set("personalDebt")} placeholder="0" />
              </div>
              <Field label="Home Loan" value={profile.homeDebt} onChange={set("homeDebt")} placeholder="0" />

              <SectionTitle>Goals & Risk</SectionTitle>
              <Field label="Financial Goal" value={profile.goal} onChange={set("goal")} type="text" placeholder="Buy a house in 5 years" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="Goal Amount" value={profile.goalAmount} onChange={set("goalAmount")} placeholder="2000000" />
                <Field label="Timeline (yrs)" value={profile.goalYears} onChange={set("goalYears")} placeholder="5" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="Age" value={profile.age} onChange={set("age")} placeholder="24" />
                <Field label="Risk" value={profile.riskTolerance} onChange={set("riskTolerance")} options={[{ v: "conservative", l: "Conservative" }, { v: "moderate", l: "Moderate" }, { v: "aggressive", l: "Aggressive" }]} />
              </div>

              <button onClick={runAnalysis} style={{ width: "100%", padding: "11px 0", background: `linear-gradient(135deg,${C.gold},${C.gold2})`, border: "none", borderRadius: 8, color: "#000", fontFamily: "'Orbitron',monospace", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", marginTop: 4, transition: "opacity 0.2s" }}
                onMouseEnter={e => e.target.style.opacity = 0.88} onMouseLeave={e => e.target.style.opacity = 1}>
                ⚡ Analyze My Finances
              </button>

              {/* Score */}
              {analyzed && (
                <div style={{ marginTop: 16 }}>
                  <SectionTitle>Health Score</SectionTitle>
                  <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${C.gold},${C.gold2})` }} />
                    <ScoreRing score={m.score} label={m.scoreLabel} color={m.scoreColor} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    <MetricCard label="DTI Ratio" value={pct(m.dtiRatio)} status={m.dtiRatio < 0.2 ? "good" : m.dtiRatio < 0.36 ? "warn" : "bad"} />
                    <MetricCard label="Savings Rate" value={pct(m.savingsRate)} status={m.savingsRate >= 0.2 ? "good" : m.savingsRate >= 0.1 ? "warn" : "bad"} />
                    <MetricCard label="EF Coverage" value={`${m.efMonths.toFixed(1)}mo`} status={m.efMonths >= 6 ? "good" : m.efMonths >= 3 ? "warn" : "bad"} />
                    <MetricCard label="Net Monthly" value={fmt(m.netSavings)} status={m.netSavings >= 0 ? "good" : "bad"} />
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ── RIGHT PANEL ── */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: "auto", background: C.bg }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: "13px 18px", fontFamily: "'Orbitron',monospace", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t ? C.gold : "transparent"}`, color: tab === t ? C.gold : C.text3, cursor: "pointer", whiteSpace: "nowrap", transition: "color 0.2s" }}>
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>

            {/* ── CHAT TAB ── */}
            {tab === "chat" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 12px", display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
                  {messages.length === 0 && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32 }}>
                      <div style={{ width: 68, height: 68, background: `linear-gradient(135deg,${C.goldDim},rgba(74,158,255,0.1))`, border: `1px solid ${C.border2}`, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", marginBottom: 18 }}>💰</div>
                      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "1.3rem", fontWeight: 800, marginBottom: 10, background: `linear-gradient(120deg,${C.text},${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your AI Finance Advisor</div>
                      <p style={{ fontSize: "0.88rem", color: C.text2, maxWidth: 400, lineHeight: 1.7, marginBottom: 24 }}>Fill in your profile and click Analyze, or ask me anything about budgeting, debt, investing, or saving goals.</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                        {["Analyse my financial health", "Best debt payoff strategy", "How to boost my savings", "Am I on track for my goal?", "What investments suit me?", "Build me a budget plan"].map(q => (
                          <button key={q} onClick={() => sendMessage(q)} style={{ padding: "7px 14px", background: C.panel, border: `1px solid ${C.border2}`, borderRadius: 20, color: C.text2, fontSize: "0.76rem", cursor: "pointer", transition: "all 0.2s" }}
                            onMouseEnter={e => { e.target.style.borderColor = C.gold; e.target.style.color = C.gold; }}
                            onMouseLeave={e => { e.target.style.borderColor = C.border2; e.target.style.color = C.text2; }}>
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => <ChatBubble key={i} msg={{ role: msg.role === "assistant" ? "ai" : "user", content: msg.content }} />)}
                  {loading && <TypingDots />}
                  <div ref={messagesEnd} />
                </div>

                {/* ── INPUT BAR — always at bottom ── */}
                <div style={{ flexShrink: 0, padding: "12px 20px 16px", borderTop: `1px solid ${C.border}`, background: C.bg2, display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                    placeholder="Ask about your finances... (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    style={{ flex: 1, resize: "none", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontFamily: "'DM Sans',sans-serif", fontSize: "0.86rem", lineHeight: 1.5, minHeight: 42, maxHeight: 120, overflowY: "auto", transition: "border-color 0.2s, box-shadow 0.2s" }}
                    onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} />
                  <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                    style={{ width: 42, height: 42, flexShrink: 0, background: `linear-gradient(135deg,${C.gold},${C.gold2})`, border: "none", borderRadius: 10, color: "#000", fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: loading || !input.trim() ? 0.4 : 1, transition: "opacity 0.2s" }}>
                    ➤
                  </button>
                </div>
              </div>
            )}

            {/* ── DASHBOARD TAB ── */}
            {tab === "dashboard" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                {!analyzed ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.text3, textAlign: "center", padding: 40 }}>
                    <div style={{ fontSize: "3rem", marginBottom: 16, opacity: 0.4 }}>📊</div>
                    <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.9rem", color: C.text2, marginBottom: 8 }}>No Data Yet</div>
                    <p style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>Fill in your profile and click <strong style={{ color: C.gold }}>Analyze My Finances</strong></p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <ChartCard title="Budget vs 50/30/20 Rule" dot={C.gold}>
                        <BudgetBar label="Needs (target ≤50%)" value={needsPct} target="max" />
                        <BudgetBar label="Wants (target ≤30%)" value={wantsPct} target="max" />
                        <BudgetBar label="Savings (target ≥20%)" value={savPct} target="min" />
                        <BudgetBar label={`Emergency Fund (${m.efMonths.toFixed(1)}/6 months)`} value={(m.efMonths / 6) * 100} target="min" />
                      </ChartCard>
                      <ChartCard title="Income Allocation" dot={C.blue}>
                        <ResponsiveContainer width="100%" height={170}>
                          <PieChart>
                            <Pie data={allocData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                              {allocData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt(v)} />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: "0.7rem", color: C.text2 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <ChartCard title="Net Worth Snapshot" dot={C.green}>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={netWorthData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                            <XAxis dataKey="name" tick={{ ...TICK_STYLE, fontSize: 9 }} axisLine={false} tickLine={false} />
                            <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={55} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt(v)} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {netWorthData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                      <ChartCard title="Priority Recommendations" dot={C.purple}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {recs.slice(0, 4).map((r, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                              <span style={{ fontSize: "1rem", flexShrink: 0 }}>{r.icon}</span>
                              <div>
                                <div style={{ fontSize: "0.8rem", fontWeight: 500, marginBottom: 2 }}>{r.t}</div>
                                <div style={{ fontSize: "0.72rem", color: C.text2 }}>{r.s}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ChartCard>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── DEBT TAB ── */}
            {tab === "debt" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                {!debtResult ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.text3, textAlign: "center", padding: 40 }}>
                    <div style={{ fontSize: "3rem", marginBottom: 16, opacity: 0.4 }}>💳</div>
                    <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.9rem", color: C.text2, marginBottom: 8 }}>{analyzed ? "🎉 No Debts Found!" : "Debt Planner Ready"}</div>
                    <p style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>{analyzed ? "Zero debt recorded. Focus on growing investments!" : "Enter debt amounts and click Analyze My Finances."}</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      {[{ method: "avalanche", color: C.green, label: "⚡ AVALANCHE", sub: "Highest rate first — mathematically optimal" },
                        { method: "snowball",  color: C.blue,  label: "❄️ SNOWBALL",  sub: "Smallest balance first — builds momentum" }
                      ].map(({ method, color, label, sub }) => (
                        <div key={method} style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `2px solid ${color}`, borderRadius: 10, padding: 18 }}>
                          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.6rem", letterSpacing: "0.15em", color, marginBottom: 10 }}>{label}</div>
                          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "1.5rem", fontWeight: 800 }}>{debtResult[method].months} <span style={{ fontSize: "0.65rem", color: C.text2, fontWeight: 400 }}>months</span></div>
                          <div style={{ fontSize: "0.75rem", color: C.text2, marginTop: 4 }}>Total interest: <strong style={{ color: C.red }}>{fmt(debtResult[method].totalInterest)}</strong></div>
                          <div style={{ fontSize: "0.7rem", color, marginTop: 8 }}>{sub}</div>
                        </div>
                      ))}
                    </div>
                    {debtResult.snowball.totalInterest > debtResult.avalanche.totalInterest && (
                      <div style={{ background: "rgba(45,212,160,0.08)", border: "1px solid rgba(45,212,160,0.2)", borderRadius: 8, padding: "12px 14px", fontSize: "0.82rem", color: C.green }}>
                        💡 <strong>Avalanche saves you {fmt(debtResult.snowball.totalInterest - debtResult.avalanche.totalInterest)}</strong> in total interest compared to Snowball.
                      </div>
                    )}
                    <ChartCard title="Debt Breakdown by Balance" dot={C.red}>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={debtResult.debts.sort((a, b) => b.rate - a.rate)} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                          <XAxis dataKey="name" tick={{ ...TICK_STYLE, fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={55} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt(v)} />
                          <Bar dataKey="balance" radius={[4, 4, 0, 0]} fill={C.red} opacity={0.75} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${C.gold},transparent)`, opacity: 0.5, position: "relative" }} />
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                            {["Debt", "Balance", "Est. Rate", "Priority"].map(h => (
                              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: "'Orbitron',monospace", fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.text3 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {debtResult.debts.sort((a, b) => b.rate - a.rate).map((d, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ padding: "10px 14px", color: C.text }}>{d.name}</td>
                              <td style={{ padding: "10px 14px", color: C.text, fontWeight: 600 }}>{fmt(d.balance)}</td>
                              <td style={{ padding: "10px 14px", fontFamily: "monospace", color: d.rate > 0.2 ? C.red : d.rate > 0.1 ? C.gold : C.green }}>{(d.rate * 100).toFixed(1)}%</td>
                              <td style={{ padding: "10px 14px" }}><span style={{ background: "rgba(201,168,76,0.1)", color: C.gold, padding: "2px 8px", borderRadius: 4, fontSize: "0.68rem", fontFamily: "'Orbitron',monospace" }}>#{i + 1}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── GOALS TAB ── */}
            {tab === "goals" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                {!analyzed || !p.goalAmount ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.text3, textAlign: "center", padding: 40 }}>
                    <div style={{ fontSize: "3rem", marginBottom: 16, opacity: 0.4 }}>🎯</div>
                    <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.9rem", color: C.text2, marginBottom: 8 }}>Goal Simulator Ready</div>
                    <p style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>Set a goal amount & timeline in your profile, then click Analyze My Finances.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                      {[
                        { key: "conservative", color: C.blue,  emoji: "🛡", label: "Conservative 4%" },
                        { key: "moderate",     color: C.gold,  emoji: "⚖️", label: "Moderate 7%" },
                        { key: "aggressive",   color: C.red,   emoji: "🚀", label: "Aggressive 10%" },
                      ].map(({ key, color, emoji, label }) => {
                        const med = mcResult?.[key]?.median || 0;
                        const pctGoal = p.goalAmount > 0 ? Math.min(100, (med / p.goalAmount) * 100) : 100;
                        return (
                          <div key={key} style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `2px solid ${color}`, borderRadius: 10, padding: 16 }}>
                            <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.58rem", letterSpacing: "0.15em", color, marginBottom: 10 }}>{emoji} {label}</div>
                            <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "1.4rem", fontWeight: 800 }}>{fmt(med)}</div>
                            <div style={{ fontSize: "0.7rem", color: C.text2, margin: "4px 0 10px" }}>Median in {p.goalYears}yr</div>
                            <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 8 }}>
                              <div style={{ height: "100%", width: `${pctGoal}%`, background: color, borderRadius: 2, transition: "width 1s ease" }} />
                            </div>
                            <div style={{ fontSize: "0.7rem", color: med >= p.goalAmount ? C.green : C.gold }}>{med >= p.goalAmount ? "✅" : "⚠️"} {pctGoal.toFixed(0)}% of {fmt(p.goalAmount)} goal</div>
                            <div style={{ fontSize: "0.65rem", color: C.text3, marginTop: 6 }}>Range: {fmt(mcResult?.[key]?.p25 || 0)} – {fmt(mcResult?.[key]?.p75 || 0)}</div>
                          </div>
                        );
                      })}
                    </div>
                    <ChartCard title={`Monte Carlo Projections — ${p.goalYears} Year Horizon`} dot={C.gold}>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={goalLines} margin={{ top: 4, right: 10, left: 0, bottom: 4 }}>
                          <XAxis dataKey="year" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                          <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={60} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt(v)} />
                          <Legend iconSize={8} wrapperStyle={{ fontSize: "0.7rem", color: C.text2 }} />
                          <Line type="monotone" dataKey="conservative" stroke={C.blue}  strokeWidth={2} dot={false} name="Conservative (4%)" />
                          <Line type="monotone" dataKey="moderate"     stroke={C.gold}  strokeWidth={2.5} dot={false} name="Moderate (7%)" />
                          <Line type="monotone" dataKey="aggressive"   stroke={C.red}   strokeWidth={2} dot={false} name="Aggressive (10%)" />
                          <Line type="monotone" dataKey="goal"         stroke={C.purple} strokeWidth={1.5} strokeDasharray="6 4" dot={false} name="Your Goal" />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
