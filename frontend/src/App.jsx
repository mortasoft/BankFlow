import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  LayoutDashboard, 
  Wallet, 
  History, 
  Settings, 
  LogOut,
  Plus,
  TrendingUp,
  ShieldCheck,
  Bell,
  ArrowRight,
  MoreVertical,
  PiggyBank,
  Briefcase,
  CircleDollarSign,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Download
} from 'lucide-react';
import axios from 'axios';

const API_BASE = "http://localhost:8013/api";

function App() {
  const [data, setData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      await axios.post(`${API_BASE}/seed`);
      const balanceRes = await axios.get(`${API_BASE}/balance/ACC-12345`);
      const txRes = await axios.get(`${API_BASE}/transactions/ACC-12345`);
      const accountsRes = await axios.get(`${API_BASE}/accounts`);
      setData({ balance: balanceRes.data.balance, transactions: txRes.data, source: balanceRes.data.source });
      setAccounts(accountsRes.data);
      setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
  };

  if (loading) return <LoadingScreen />;

  const currentAccount = accounts.find(a => a.account_number === "INV-44556") || accounts[0];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo-section" style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <div style={{background:'var(--accent-emerald)', padding:'8px', borderRadius:'12px'}}><ShieldCheck color="#050505" size={24} /></div>
          <h1>Bank<span style={{color:'var(--accent-emerald)'}}>Flow</span></h1>
        </div>
        <nav className="nav-group" style={{display:'flex', flexDirection:'column', gap:'8px', flex:'1'}}>
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <NavItem icon={<Wallet size={20} />} label="Personal Accounts" active={activeTab === "accounts"} onClick={() => setActiveTab("accounts")} />
          <NavItem icon={<TrendingUp size={20} />} label="Investments" active={activeTab === "investments"} onClick={() => setActiveTab("investments")} />
          <NavItem icon={<History size={20} />} label="History" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
          <NavItem icon={<Settings size={20} />} label="Settings" />
        </nav>
        <div className="logout-section">
          <button className="nav-item" style={{width:'100%', border:'none', background:'transparent', color:'#ef4444'}}><LogOut size={20} /><span>Sign Out</span></button>
        </div>
      </aside>

      <main className="main-content">
        <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'40px'}}>
          <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} key={activeTab}>
            <h2>{activeTab === "dashboard" ? "Welcome, John Doe" : activeTab === "accounts" ? "Accounts" : activeTab === "investments" ? "Portfolio" : "Transaction History"}</h2>
            <p className="text-dim">
              {activeTab === "history" ? "Review and filter your financial archive." : "Track and optimize your wealth with precision."}
            </p>
          </motion.div>
          <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
            <div className="glass-card" style={{padding:'10px', borderRadius:'12px', cursor:'pointer'}}><Bell size={20} className="text-dim" /></div>
            <button className="btn-premium"><Plus size={20} /><span>Action</span></button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && <motion.div key="db" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}><DashboardView data={data} /></motion.div>}
          {activeTab === "accounts" && <motion.div key="acc" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}><AccountsView accounts={accounts} /></motion.div>}
          {activeTab === "investments" && <motion.div key="inv" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}><InvestmentsView account={currentAccount} /></motion.div>}
          {activeTab === "history" && <motion.div key="hist" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}><HistoryView transactions={data.transactions} /></motion.div>}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span></div>;
}

function DashboardView({ data }) {
  return (
    <div className="dashboard-grid">
      <div className="col-8" style={{display:'flex', flexDirection:'column', gap:'30px'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'30px'}}><BalanceCard balance={data.balance} source={data.source} /><VirtualCard /></div>
        <div className="glass-card">
          <h3 style={{fontSize:'1.25rem', marginBottom:'24px'}}>Recent Activity</h3>
          <div className="transaction-list">{data.transactions.slice(0, 4).map((tx, idx) => (<TransactionRow key={idx} tx={tx} index={idx} />))}</div>
          <button className="nav-item" style={{marginTop:'20px', width:'100%', justifyContent:'center'}} onClick={() => setActiveTab("history")}>View Full History</button>
        </div>
      </div>
      <div className="col-4"><StatsCard /></div>
    </div>
  );
}

function AccountsView({ accounts }) {
  return <div className="accounts-grid">{accounts.map((acc, idx) => (<motion.div key={acc.account_number} className="account-card" initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} transition={{delay: idx * 0.1}}><h4 style={{fontSize:'1.1rem'}}>{acc.account_number}</h4><h3>${acc.balance.toLocaleString()}</h3></motion.div>))}</div>;
}

function InvestmentsView({ account }) {
  return <div style={{display:'flex', flexDirection:'column', gap:'30px'}}><div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'30px'}}><InvestmentSummary title="Portafolio" value={account.balance} change="+12.5%" isUp /></div><div className="glass-card"><h4>Holdings</h4><table className="asset-table"><thead><tr><th>Asset</th><th>Shares</th><th>Value</th></tr></thead><tbody>{account.holdings?.map(h => (<tr key={h.id}><td>{h.symbol}</td><td>{h.shares}</td><td>${(h.shares * 215).toLocaleString()}</td></tr>))}</tbody></table></div></div>;
}

function HistoryView({ transactions }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase());
    if (filter === "all") return matchesSearch;
    if (filter === "income") return matchesSearch && t.amount > 0;
    if (filter === "expense") return matchesSearch && t.amount < 0;
    return matchesSearch;
  });

  return (
    <div className="glass-card" style={{padding:'40px'}}>
      <div className="filter-bar">
        <div style={{position:'relative', flex:1}}>
          <Search size={18} style={{position:'absolute', left:'15px', top:'50%', transform:'translateY(-50%)', color:'var(--text-dim)'}} />
          <input 
            type="text" 
            placeholder="Search by vendor or service..." 
            className="search-input" 
            style={{paddingLeft:'45px'}}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter("all")}>All</button>
        <button className={`filter-btn ${filter === 'income' ? 'active' : ''}`} onClick={() => setFilter("income")}>Income</button>
        <button className={`filter-btn ${filter === 'expense' ? 'active' : ''}`} onClick={() => setFilter("expense")}>Expenses</button>
        <button className="filter-btn"><Download size={18} /></button>
      </div>

      <div className="transaction-list">
        {filtered.map((tx, idx) => (
          <TransactionRow key={idx} tx={tx} index={idx} />
        ))}
        {filtered.length === 0 && (
          <div style={{textAlign:'center', padding:'80px', color:'var(--text-dim)'}}>
             <History size={48} style={{opacity:0.2, marginBottom:'20px'}} />
             <p>No transactions found for the selected criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InvestmentSummary({ title, value, change, isUp }) {
  return <div className="glass-card"><p className="text-dim" style={{fontSize:'0.8rem', marginBottom:'8px'}}>{title}</p><div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}><h3 style={{fontSize:'1.8rem'}}>${value.toLocaleString()}</h3><span style={{color: isUp ? '#10b981' : '#ef4444'}}>{change}</span></div></div>;
}

function BalanceCard({ balance, source }) {
  return <div className="glass-card" style={{background:'linear-gradient(225deg, #111827 0%, #050505 100%)'}}><p className="text-dim" style={{fontSize:'0.8rem', marginBottom:'20px'}}>Available Balance</p><h3 style={{fontSize:'2.5rem'}}>${balance.toLocaleString()}</h3></div>;
}

function VirtualCard() { return <div className="glass-card" style={{background:'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', color:'#050505'}}><h4 style={{marginBottom:'40px'}}>VISA BLACK</h4><p style={{fontSize:'1.4rem', fontFamily:'monospace', textAlign:'center'}}>**** **** **** 5562</p></div>; }

function TransactionRow({ tx, index }) {
  const isOut = tx.amount < 0;
  return (
    <div className="transaction-item">
      <div style={{display:'flex', gap:'16px', alignItems:'center'}}>
        <div style={{width:'40px', height:'40px', background: isOut ? '#ef444415' : '#10b98115', color: isOut ? '#ef4444' : '#10b981', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'12px'}}>
          {isOut ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
        </div>
        <div><p style={{fontWeight:'600'}}>{tx.description}</p><p className="text-dim" style={{fontSize:'0.75rem'}}>{new Date(tx.timestamp).toLocaleDateString()}</p></div>
      </div>
      <p style={{fontWeight:'700', color: isOut ? 'white' : 'var(--accent-emerald)'}}>{isOut ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}</p>
    </div>
  );
}

function StatsCard() { return <div className="glass-card"><h4>Goals</h4><div style={{marginTop:'20px'}}><GoalItem label="Home" progress={65} color="var(--accent-emerald)" /></div></div>; }
function GoalItem({ label, progress, color }) { return <div><div style={{display:'flex', justifyContent:'space-between', fontSize:'0.8rem'}}><span className="text-dim">{label}</span><span>{progress}%</span></div><div className="progress-container"><div className="progress-bar" style={{background:color, width:`${progress}%`}}></div></div></div>; }
function LoadingScreen() { return <div style={{height:'100vh', width:'100vw', display:'flex', alignItems:'center', justifyContent:'center', background:'#050505'}}><div style={{width:'40px', height:'40px', border:'4px solid #10b981', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite'}}></div><style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style></div>; }

export default App;
