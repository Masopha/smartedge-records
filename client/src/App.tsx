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
          // Refresh user data in storage
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

  const currentDate = new Date();
  const week = Math.ceil(currentDate.getDate() / 7);
  const month = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

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
          <Route path="/sales" element={
            user ? (
              <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
                <SalesTable week={week} month={month} year={year} />
              </div>
            ) : <Navigate to="/login" />
          } />
          <Route path="/costs" element={
            user ? (
              <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
                <CostsTable week={week} month={month} year={year} />
              </div>
            ) : <Navigate to="/login" />
          } />
          <Route path="/statistics" element={
            user ? (
              <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
                <Statistics year={year} month={month} week={week} />
              </div>
            ) : <Navigate to="/login" />
          } />
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