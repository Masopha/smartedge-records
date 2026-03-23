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
import { authService } from './services';

interface User {
  id: string;
  staffId: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
}

// ─── Helper: get current SA date values ───────────────────────────────────────
// Uses Africa/Johannesburg timezone so the default period is always
// correct regardless of where the user's browser is located.
const getSADateParts = () => {
  const now = new Date();
  const saDate = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
  const month = saDate.toLocaleString('default', { month: 'long' });
  const year = saDate.getFullYear();
  // Week number within the month (1–5)
  const week = Math.ceil(saDate.getDate() / 7);
  return { week, month, year };
};

// ─── All months and week options for the period selector ─────────────────────
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const WEEKS = [1, 2, 3, 4, 5];

// ─── Generate a sensible range of years (5 years back, 2 years forward) ──────
export const getYearOptions = () => {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 5; y <= current + 2; y++) years.push(y);
  return years;
};

// ─── Period Selector component ────────────────────────────────────────────────
// Rendered on the Sales, Costs and Statistics pages so the user can
// freely navigate to any week/month/year without any external calendar.
interface PeriodSelectorProps {
  week: number;
  month: string;
  year: number;
  onChange: (week: number, month: string, year: number) => void;
}

export const PeriodSelector = ({ week, month, year, onChange }: PeriodSelectorProps) => {
  const years = getYearOptions();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(102,126,234,0.2)',
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 20
      }}
    >
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: 4 }}>
        Period
      </span>

      {/* Week selector */}
      <select
        value={week}
        onChange={e => onChange(Number(e.target.value), month, year)}
        style={{
          background: 'rgba(102,126,234,0.1)',
          border: '1px solid rgba(102,126,234,0.25)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          padding: '4px 10px',
          fontSize: '0.85rem',
          cursor: 'pointer'
        }}
      >
        {WEEKS.map(w => (
          <option key={w} value={w} style={{ background: '#0f172a' }}>Week {w}</option>
        ))}
      </select>

      {/* Month selector */}
      <select
        value={month}
        onChange={e => onChange(week, e.target.value, year)}
        style={{
          background: 'rgba(102,126,234,0.1)',
          border: '1px solid rgba(102,126,234,0.25)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          padding: '4px 10px',
          fontSize: '0.85rem',
          cursor: 'pointer'
        }}
      >
        {MONTHS.map(m => (
          <option key={m} value={m} style={{ background: '#0f172a' }}>{m}</option>
        ))}
      </select>

      {/* Year selector */}
      <select
        value={year}
        onChange={e => onChange(week, month, Number(e.target.value))}
        style={{
          background: 'rgba(102,126,234,0.1)',
          border: '1px solid rgba(102,126,234,0.25)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          padding: '4px 10px',
          fontSize: '0.85rem',
          cursor: 'pointer'
        }}
      >
        {years.map(y => (
          <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>
        ))}
      </select>

      {/* Jump to today shortcut */}
      <button
        onClick={() => {
          const { week: w, month: m, year: y } = getSADateParts();
          onChange(w, m, y);
        }}
        style={{
          background: 'rgba(102,126,234,0.15)',
          border: '1px solid rgba(102,126,234,0.3)',
          borderRadius: 6,
          color: '#667eea',
          padding: '4px 12px',
          fontSize: '0.78rem',
          cursor: 'pointer',
          fontWeight: 600,
          letterSpacing: '0.03em'
        }}
      >
        Today
      </button>
    </div>
  );
};

// ─── Page wrapper that owns the period state ──────────────────────────────────
// Each data page (Sales, Costs, Statistics) gets its own independent
// period state so switching periods on Sales doesn't reset Costs, etc.
const SalesPage = () => {
  const defaults = getSADateParts();
  const [period, setPeriod] = useState(defaults);

  return (
    <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
      <PeriodSelector
        week={period.week}
        month={period.month}
        year={period.year}
        onChange={(w, m, y) => setPeriod({ week: w, month: m, year: y })}
      />
      <SalesTable week={period.week} month={period.month} year={period.year} />
    </div>
  );
};

const CostsPage = () => {
  const defaults = getSADateParts();
  const [period, setPeriod] = useState(defaults);

  return (
    <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
      <PeriodSelector
        week={period.week}
        month={period.month}
        year={period.year}
        onChange={(w, m, y) => setPeriod({ week: w, month: m, year: y })}
      />
      <CostsTable week={period.week} month={period.month} year={period.year} />
    </div>
  );
};

const StatisticsPage = () => {
  const defaults = getSADateParts();
  const [period, setPeriod] = useState(defaults);

  return (
    <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
      <PeriodSelector
        week={period.week}
        month={period.month}
        year={period.year}
        onChange={(w, m, y) => setPeriod({ week: w, month: m, year: y })}
      />
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
          <Route path="/settings/fields" element={
            user?.role === 'admin' ? <DynamicFieldsSettings /> : <Navigate to="/" />
          } />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: 'rgba(15,23,42,0.97)',
              color: '#f8fafc',
              border: '1px solid rgba(102,126,234,0.25)',
              borderRadius: '10px',
              fontSize: '0.875rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
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
