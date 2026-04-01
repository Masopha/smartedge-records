import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';

import {
  AnimatedBackground,
  NavigationBar,
  Dashboard,
  SalesTable,
  CostsTable,
  Statistics,
  Login,
  DynamicFieldsSettings
} from './components';
import { authService, reportService } from './services';

interface User {
  id: string;
  staffId: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
}

export interface Period {
  week: number;
  month: string;
  year: number;
}

// ─── Get current SA date parts ────────────────────────────────────────────────
export const getSADateParts = (): Period => {
  const now = new Date();
  const saDate = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
  return {
    week: Math.ceil(saDate.getDate() / 7),
    month: saDate.toLocaleString('default', { month: 'long' }),
    year: saDate.getFullYear()
  };
};

// ─── Format a period as a readable label ─────────────────────────────────────
export const formatPeriodLabel = (p: Period): string =>
  `${p.month} — Week ${p.week} — ${p.year}`;

// ─── Smart Period Selector ────────────────────────────────────────────────────
// Fetches all periods with real data from the backend.
// Shows them in one dropdown — no empty periods ever appear.
// Always includes the current SA period at the top so new data can be entered.
interface PeriodSelectorProps {
  value: Period;
  onChange: (p: Period) => void;
}

export const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getAvailablePeriods()
      .then((res: any) => {
        const data: Period[] = res.data.data;
        setPeriods(data);
        // Auto-jump to most recent period with data if current selection is empty
        if (data.length > 0) {
          const currentKey = `${value.week}-${value.month}-${value.year}`;
          const exists = data.some(p => `${p.week}-${p.month}-${p.year}` === currentKey);
          if (!exists) onChange(data[0]);
        }
      })
      .catch(() => { /* silently fail, selector stays on current period */ })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSA = getSADateParts();
  const currentKey = `${currentSA.week}-${currentSA.month}-${currentSA.year}`;
  const selectedKey = `${value.week}-${value.month}-${value.year}`;

  // Build dropdown options: current period first, then all historical ones
  const allOptions: Period[] = [];
  const seenKeys = new Set<string>();
  allOptions.push(currentSA);
  seenKeys.add(currentKey);
  periods.forEach(p => {
    const k = `${p.week}-${p.month}-${p.year}`;
    if (!seenKeys.has(k)) { allOptions.push(p); seenKeys.add(k); }
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(102,126,234,0.2)',
      borderRadius: 10, padding: '10px 14px', marginBottom: 20
    }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: 4 }}>
        Period
      </span>

      {loading ? (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading periods...</span>
      ) : (
        <select
          value={selectedKey}
          onChange={e => {
            const chosen = allOptions.find(p => `${p.week}-${p.month}-${p.year}` === e.target.value);
            if (chosen) onChange(chosen);
          }}
          style={{
            background: 'rgba(102,126,234,0.1)', border: '1px solid rgba(102,126,234,0.25)',
            borderRadius: 6, color: 'var(--text-primary)', padding: '6px 14px',
            fontSize: '0.88rem', cursor: 'pointer', minWidth: 260
          }}
        >
          {allOptions.map(p => {
            const k = `${p.week}-${p.month}-${p.year}`;
            const isToday = k === currentKey;
            return (
              <option key={k} value={k} style={{ background: '#0f172a' }}>
                {isToday ? `📍 ${formatPeriodLabel(p)} (Current)` : formatPeriodLabel(p)}
              </option>
            );
          })}
        </select>
      )}

      <button
        onClick={() => onChange(currentSA)}
        style={{
          background: selectedKey === currentKey ? 'rgba(102,126,234,0.3)' : 'rgba(102,126,234,0.12)',
          border: '1px solid rgba(102,126,234,0.3)', borderRadius: 6, color: '#667eea',
          padding: '5px 14px', fontSize: '0.78rem', cursor: 'pointer',
          fontWeight: 600, letterSpacing: '0.03em', transition: 'all 0.2s'
        }}
      >
        Today
      </button>
    </div>
  );
};

// ─── Page wrappers — each owns its own independent period state ───────────────
const SalesPage = () => {
  const [period, setPeriod] = useState<Period>(getSADateParts);
  return (
    <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
      <PeriodSelector value={period} onChange={setPeriod} />
      <SalesTable week={period.week} month={period.month} year={period.year} />
    </div>
  );
};

const CostsPage = () => {
  const [period, setPeriod] = useState<Period>(getSADateParts);
  return (
    <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
      <PeriodSelector value={period} onChange={setPeriod} />
      <CostsTable week={period.week} month={period.month} year={period.year} />
    </div>
  );
};

const StatisticsPage = () => {
  const [period, setPeriod] = useState<Period>(getSADateParts);
  return (
    <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
      <PeriodSelector value={period} onChange={setPeriod} />
      <Statistics year={period.year} month={period.month} week={period.week} />
    </div>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      authService.getMe()
        .then((res: any) => {
          setUser(res.data.data);
          localStorage.setItem('user', JSON.stringify(res.data.data));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData: User) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16, background: '#020617' }}>
        <div className="spinner" />
        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading SmartEdge...</span>
      </div>
    );
  }

  return (
    <Router>
      <div style={{ minHeight: '100vh' }}>
        <AnimatedBackground />
        {user && <NavigationBar user={user} onLogout={handleLogout} />}
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
          <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/sales" element={user ? <SalesPage /> : <Navigate to="/login" />} />
          <Route path="/costs" element={user ? <CostsPage /> : <Navigate to="/login" />} />
          <Route path="/statistics" element={user ? <StatisticsPage /> : <Navigate to="/login" />} />
          <Route path="/settings/fields" element={user?.role === 'admin' ? <DynamicFieldsSettings /> : <Navigate to="/" />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: 'rgba(15,23,42,0.97)', color: '#f8fafc',
              border: '1px solid rgba(102,126,234,0.25)', borderRadius: '10px',
              fontSize: '0.875rem', boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#f8fafc' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#f8fafc' } }
          }}
        />
      </div>
    </Router>
  );
};

export default App;
