import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Form, Button,
  Navbar, Nav, Spinner, Modal, Alert, Dropdown, Badge, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import {
  FaEdit, FaTrash, FaSave, FaPlus, FaChartLine,
  FaChartBar, FaChartPie, FaSignOutAlt, FaKey, FaLock,
  FaUndo, FaEye, FaEyeSlash, FaTimes, FaCheck, FaColumns,
  FaBars, FaHome, FaDollarSign, FaMoneyBillWave, FaPercent,
  FaExclamationTriangle, FaTrashAlt, FaRedo, FaInfoCircle
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import toast from 'react-hot-toast';
import { formatCurrency, calculateProfitMargin } from './utils';
import { authService, salesService, costsService, fieldService, reportService } from './services';

// =====================================================
// ANIMATION VARIANTS
// =====================================================
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] } })
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.93 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] } }
};

const slideLeft = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
};

const rowVariant = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.3 } }),
  exit: { opacity: 0, x: 12, transition: { duration: 0.2 } }
};

// =====================================================
// LOADER
// =====================================================
export const Loader = ({ text = 'Loading...' }) => (
  <div className="spinner-container">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="spinner" />
    </motion.div>
    <span className="spinner-text">{text}</span>
  </div>
);

// =====================================================
// ANIMATED BACKGROUND
// =====================================================
export const AnimatedBackground = () => {
  useEffect(() => {
    const createElements = (id, cls, count, extras = () => ({})) => {
      const container = document.getElementById(id);
      if (!container) return;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = cls;
        el.style.left = Math.random() * 100 + '%';
        el.style.top = Math.random() * 100 + '%';
        el.style.animationDelay = Math.random() * 8 + 's';
        el.style.animationDuration = (Math.random() * 8 + 8) + 's';
        Object.assign(el.style, extras());
        container.appendChild(el);
      }
    };

    createElements('particles', 'particle', 25, () => {
      const size = Math.random() * 6 + 4;
      return { width: size + 'px', height: size + 'px' };
    });
    createElements('stars', 'star', 60, () => {
      const size = Math.random() * 2 + 1;
      return { width: size + 'px', height: size + 'px' };
    });
    createElements('circles', 'circle', 12, () => {
      const size = Math.random() * 180 + 60;
      return { width: size + 'px', height: size + 'px' };
    });

    return () => {
      ['particles', 'stars', 'circles'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
      });
    };
  }, []);

  return (
    <>
      <div className="app-bg" />
      <div id="particles" className="particles" />
      <div id="stars" className="stars" />
      <div id="circles" className="circles" />
    </>
  );
};

// =====================================================
// CONFIRM DIALOG
// =====================================================
const ConfirmDialog = ({ show, title, message, onConfirm, onCancel, variant = 'danger', confirmText = 'Confirm' }) => (
  <Modal show={show} onHide={onCancel} centered size="sm">
    <Modal.Header closeButton>
      <Modal.Title style={{ fontSize: '1rem' }}>
        <FaExclamationTriangle className="me-2" style={{ color: variant === 'danger' ? '#ef4444' : '#f59e0b' }} />
        {title}
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{message}</p>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
      <Button variant={variant} size="sm" onClick={onConfirm}>{confirmText}</Button>
    </Modal.Footer>
  </Modal>
);

// =====================================================
// PASSWORD CHANGE MODAL
// =====================================================
export const PasswordChange = ({ show, onHide, onSuccess }) => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

  const reset = () => {
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword.length < 6) return setError('New password must be at least 6 characters');
    if (form.newPassword !== form.confirmPassword) return setError('New passwords do not match');
    if (form.newPassword === form.currentPassword) return setError('New password must differ from current');

    setLoading(true);
    try {
      const res = await authService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      if (res.data.token) localStorage.setItem('token', res.data.token);
      toast.success('Password changed successfully!');
      onSuccess?.();
      reset();
      onHide();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const PwdField = ({ label, field, placeholder }) => (
    <Form.Group className="mb-3">
      <Form.Label>{label}</Form.Label>
      <div style={{ position: 'relative' }}>
        <Form.Control
          type={showPwd[field] ? 'text' : 'password'}
          value={form[field === 'current' ? 'currentPassword' : field === 'new' ? 'newPassword' : 'confirmPassword']}
          onChange={e => setForm(f => ({ ...f, [field === 'current' ? 'currentPassword' : field === 'new' ? 'newPassword' : 'confirmPassword']: e.target.value }))}
          required placeholder={placeholder}
        />
        <button type="button" onClick={() => setShowPwd(p => ({ ...p, [field]: !p[field] }))}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          {showPwd[field] ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
        </button>
      </div>
    </Form.Group>
  );

  return (
    <Modal show={show} onHide={() => { reset(); onHide(); }} centered>
      <Modal.Header closeButton>
        <Modal.Title><FaLock className="me-2" style={{ color: 'var(--primary)' }} />Change Password</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <PwdField label="Current Password" field="current" placeholder="Enter current password" />
          <PwdField label="New Password" field="new" placeholder="Min 6 characters" />
          <PwdField label="Confirm New Password" field="confirm" placeholder="Re-enter new password" />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { reset(); onHide(); }}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <><Spinner size="sm" className="me-2" />Saving...</> : <><FaCheck className="me-2" />Change Password</>}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

// =====================================================
// NAVIGATION BAR
// =====================================================
export const NavigationBar = ({ user, onLogout }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const path = window.location.pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: <FaHome size={12} /> },
    { href: '/sales', label: 'Sales', icon: <FaChartLine size={12} /> },
    { href: '/costs', label: 'Costs', icon: <FaMoneyBillWave size={12} /> },
    { href: '/statistics', label: 'Statistics', icon: <FaChartBar size={12} /> },
  ];

  if (user?.role === 'admin') {
    navItems.push({ href: '/settings/fields', label: 'Settings', icon: <FaColumns size={12} /> });
  }

  return (
    <>
      <motion.nav
        className="navbar"
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ boxShadow: scrolled ? '0 4px 40px rgba(0,0,0,0.5)' : undefined }}
      >
        <div className="navbar-inner">
          <a href="/" className="navbar-brand">
            <span>SmartEdge</span>
          </a>

          <ul className="nav-links">
            {navItems.map(item => (
              <li key={item.href}>
                <a href={item.href} className={`nav-link${path === item.href ? ' active' : ''}`}>
                  {item.icon} {item.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#" className="nav-link" onClick={e => { e.preventDefault(); setShowPasswordModal(true); }}>
                <FaKey size={12} /> Password
              </a>
            </li>
            <li>
              <a href="#" className="nav-link" style={{ color: '#ef4444' }}
                onClick={e => { e.preventDefault(); onLogout(); }}>
                <FaSignOutAlt size={12} /> Logout
              </a>
            </li>
          </ul>

          <div className="nav-user-badge">
            <FaLock size={10} />
            <span>{user?.staffId}</span>
            <span className="role-badge">{user?.role}</span>
          </div>
        </div>
      </motion.nav>

      <PasswordChange show={showPasswordModal} onHide={() => setShowPasswordModal(false)} />
    </>
  );
};

// =====================================================
// COLUMN RENAME MODAL
// =====================================================
const ColumnRenameModal = ({ show, column, onSave, onHide }) => {
  const [name, setName] = useState('');
  useEffect(() => { if (column) setName(column.label); }, [column]);

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1rem' }}>Rename Column</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label>Column Name</Form.Label>
          <Form.Control value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())}
            autoFocus placeholder="Enter column name" />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={() => name.trim() && onSave(name.trim())}>Save</Button>
      </Modal.Footer>
    </Modal>
  );
};

// =====================================================
// ADD COLUMN MODAL
// =====================================================
const AddColumnModal = ({ show, type, onSave, onHide }) => {
  const [name, setName] = useState('');
  const [fieldType, setFieldType] = useState('currency');

  const handleSave = () => {
    if (!name.trim()) return toast.error('Please enter a column name');
    onSave({ fieldName: name.trim(), fieldType, type });
    setName(''); setFieldType('currency');
  };

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1rem' }}><FaPlus className="me-2" style={{ color: 'var(--primary)' }} />Add Column</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Column Name</Form.Label>
          <Form.Control value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus placeholder="e.g. Accessories, Warranty" />
        </Form.Group>
        <Form.Group>
          <Form.Label>Field Type</Form.Label>
          <Form.Select value={fieldType} onChange={e => setFieldType(e.target.value)}>
            <option value="currency">Currency (ZAR)</option>
            <option value="number">Number</option>
            <option value="percentage">Percentage</option>
          </Form.Select>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave}><FaPlus className="me-1" />Add</Button>
      </Modal.Footer>
    </Modal>
  );
};

// =====================================================
// ADD ROW MODAL
// =====================================================
const AddRowModal = ({ show, type, baseColumns, dynamicFields, week, month, year, onSave, onHide }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [day, setDay] = useState('Mon');
  const [values, setValues] = useState({});

  const handleSave = () => {
    onSave({ day, ...values, week, month, year });
    setValues({});
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1rem' }}><FaPlus className="me-2" style={{ color: 'var(--success)' }} />Add Row</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Day</Form.Label>
          <Form.Select value={day} onChange={e => setDay(e.target.value)}>
            {days.map(d => <option key={d}>{d}</option>)}
          </Form.Select>
        </Form.Group>
        {baseColumns.map(col => (
          <Form.Group key={col.key} className="mb-3">
            <Form.Label>{col.label}</Form.Label>
            <Form.Control type="number" min="0" step="0.01"
              value={values[col.key] || ''}
              onChange={e => setValues(v => ({ ...v, [col.key]: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00" />
          </Form.Group>
        ))}
        {dynamicFields.map(f => (
          <Form.Group key={f._id} className="mb-3">
            <Form.Label>{f.fieldName}</Form.Label>
            <Form.Control type="number" min="0" step="0.01"
              value={values[`dyn_${f.fieldName}`] || ''}
              onChange={e => setValues(v => ({ ...v, [`dyn_${f.fieldName}`]: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00" />
          </Form.Group>
        ))}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>Cancel</Button>
        <Button variant="success" size="sm" onClick={handleSave}><FaPlus className="me-1" />Add Row</Button>
      </Modal.Footer>
    </Modal>
  );
};

// =====================================================
// SALES TABLE
// =====================================================
export const SalesTable = ({ week, month, year }) => {
  const [data, setData] = useState({});
  const [fields, setFields] = useState([]);
  const [deletedFields, setDeletedFields] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddCol, setShowAddCol] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);
  const [renameCol, setRenameCol] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const baseColumns = [
    { key: 'designMovies', label: 'Design & Movies' },
    { key: 'phoneRepairs', label: 'Phone Repairs' },
    { key: 'laptopRepairs', label: 'Laptop Repairs' },
    { key: 'electronicsSales', label: 'Electronics Sales' }
  ];

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [salesRes, fieldsRes, deletedRes] = await Promise.all([
        salesService.getAll({ year, month, week, includeDeleted: showDeleted }),
        fieldService.getAll('sales'),
        fieldService.getAll('sales', true)
      ]);
      const organized = {};
      salesRes.data.data.forEach(r => { organized[r.day] = r; });
      setData(organized);
      setFields(fieldsRes.data.data);
      setDeletedFields(deletedRes.data.data.filter(f => !f.isActive));
    } catch {
      toast.error('Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  }, [week, month, year, showDeleted]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const startEdit = (day) => {
    const record = data[day] || {};
    const vals = {};
    baseColumns.forEach(col => { vals[col.key] = record[col.key] || 0; });
    fields.forEach(f => { vals[`dyn_${f.fieldName}`] = record.values?.get?.(f.fieldName) ?? record.values?.[f.fieldName] ?? 0; });
    setEditValues(vals);
    setEditing(day);
  };

  const handleSave = async (day) => {
    setSaving(true);
    try {
      const payload = { week, month, year, day };
      baseColumns.forEach(col => { payload[col.key] = parseFloat(editValues[col.key]) || 0; });
      const dynValues = {};
      fields.forEach(f => { dynValues[f.fieldName] = parseFloat(editValues[`dyn_${f.fieldName}`]) || 0; });
      payload.values = dynValues;
      await salesService.create(payload);
      toast.success(`✅ Saved ${day}`);
      await fetchAll();
      setEditing(null);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, permanent = false) => {
    try {
      if (permanent) await salesService.permanentDelete(id);
      else await salesService.delete(id);
      toast.success(permanent ? 'Permanently deleted' : 'Row deleted');
      fetchAll();
    } catch { toast.error('Failed to delete'); }
    setConfirm(null);
  };

  const handleRestore = async (id) => {
    try {
      await salesService.restore(id);
      toast.success('Row restored');
      fetchAll();
    } catch { toast.error('Failed to restore'); }
  };

  const handleAddColumn = async (colData) => {
    try {
      await fieldService.create({ ...colData, type: 'sales' });
      toast.success(`Column "${colData.fieldName}" added`);
      setShowAddCol(false);
      fetchAll();
    } catch { toast.error('Failed to add column'); }
  };

  const handleRenameColumn = async (newName) => {
    try {
      await fieldService.update(renameCol._id, { fieldName: newName });
      toast.success('Column renamed');
      setRenameCol(null);
      fetchAll();
    } catch { toast.error('Failed to rename column'); }
  };

  const handleDeleteColumn = async (id, permanent = false) => {
    try {
      if (permanent) await fieldService.permanentDelete(id);
      else await fieldService.delete(id);
      toast.success(permanent ? 'Column permanently deleted' : 'Column hidden');
      fetchAll();
    } catch { toast.error('Failed to delete column'); }
    setConfirm(null);
  };

  const handleRestoreColumn = async (id) => {
    try {
      await fieldService.restore(id);
      toast.success('Column restored');
      fetchAll();
    } catch { toast.error('Failed to restore column'); }
  };

  const handleAddRow = async (rowData) => {
    try {
      const dynValues = {};
      fields.forEach(f => { dynValues[f.fieldName] = rowData[`dyn_${f.fieldName}`] || 0; delete rowData[`dyn_${f.fieldName}`]; });
      await salesService.create({ ...rowData, values: dynValues });
      toast.success('Row added');
      fetchAll();
    } catch { toast.error('Failed to add row'); }
  };

  const calcTotals = () => {
    const totals = {};
    baseColumns.forEach(c => totals[c.key] = 0);
    fields.forEach(f => totals[`dyn_${f.fieldName}`] = 0);
    let grandTotal = 0;
    Object.values(data).forEach(r => {
      if (r.isDeleted) return;
      baseColumns.forEach(c => { totals[c.key] += r[c.key] || 0; });
      fields.forEach(f => {
        const v = r.values?.get?.(f.fieldName) ?? r.values?.[f.fieldName] ?? 0;
        totals[`dyn_${f.fieldName}`] += v;
      });
      grandTotal += r.totalSales || 0;
    });
    return { totals, grandTotal };
  };

  if (loading) return <Loader text="Loading sales data..." />;
  const { totals, grandTotal } = calcTotals();

  return (
    <>
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card>
          <Card.Header>
            <div>
              <h3>Daily Sales Summary</h3>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Week {week} · {month} {year}
              </small>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="secondary" size="sm" onClick={() => setShowDeleted(v => !v)}>
                {showDeleted ? <><FaEyeSlash size={11} className="me-1" />Hide Deleted</> : <><FaEye size={11} className="me-1" />Show Deleted</>}
              </Button>
              <Button variant="success" size="sm" onClick={() => setShowAddRow(true)}>
                <FaPlus size={11} className="me-1" />Add Row
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowAddCol(true)}>
                <FaColumns size={11} className="me-1" />Add Column
              </Button>
            </div>
          </Card.Header>
          <Card.Body style={{ padding: 0 }}>
            <div className="table-wrapper">
              <Table className="table-striped">
                <thead>
                  <tr>
                    <th>Day</th>
                    {baseColumns.map(col => <th key={col.key}>{col.label}</th>)}
                    {fields.map(f => (
                      <th key={f._id}>
                        <div className="col-header">
                          {f.fieldName}
                          <div className="col-actions">
                            <button className="col-action-btn edit" title="Rename" onClick={() => setRenameCol(f)}><FaEdit /></button>
                            <button className="col-action-btn delete" title="Remove" onClick={() => setConfirm({ type: 'deleteCol', id: f._id, name: f.fieldName })}><FaTrash /></button>
                          </div>
                        </div>
                      </th>
                    ))}
                    {deletedFields.length > 0 && deletedFields.map(f => (
                      <th key={f._id} style={{ opacity: 0.4 }}>
                        <div className="col-header">
                          <s>{f.fieldName}</s>
                          <div className="col-actions">
                            <button className="col-action-btn edit" title="Restore" onClick={() => handleRestoreColumn(f._id)}><FaUndo /></button>
                            <button className="col-action-btn delete" title="Delete Forever" onClick={() => setConfirm({ type: 'deleteColPerm', id: f._id, name: f.fieldName })}><FaTrashAlt /></button>
                          </div>
                        </div>
                      </th>
                    ))}
                    <th>Total Sales</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {days.map((day, i) => {
                      const record = data[day] || {};
                      const isEditing = editing === day;
                      const isDeleted = record.isDeleted;

                      return (
                        <motion.tr key={day}
                          variants={rowVariant} custom={i}
                          initial="hidden" animate="visible" exit="exit"
                          className={isDeleted ? 'row-deleted' : isEditing ? 'editing-row' : ''}>
                          <td><strong style={{ color: 'var(--primary)' }}>{day}</strong></td>
                          {baseColumns.map(col => (
                            <td key={col.key}>
                              {isEditing ? (
                                <Form.Control type="number" min="0" size="sm"
                                  value={editValues[col.key] ?? 0}
                                  onChange={e => setEditValues(v => ({ ...v, [col.key]: e.target.value }))} />
                              ) : (
                                <span style={{ color: record[col.key] > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                  {formatCurrency(record[col.key] || 0)}
                                </span>
                              )}
                            </td>
                          ))}
                          {fields.map(f => {
                            const val = record.values?.get?.(f.fieldName) ?? record.values?.[f.fieldName] ?? 0;
                            return (
                              <td key={f._id}>
                                {isEditing ? (
                                  <Form.Control type="number" min="0" size="sm"
                                    value={editValues[`dyn_${f.fieldName}`] ?? 0}
                                    onChange={e => setEditValues(v => ({ ...v, [`dyn_${f.fieldName}`]: e.target.value }))} />
                                ) : (
                                  <span style={{ color: val > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                    {formatCurrency(val)}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          {deletedFields.map(f => <td key={f._id} style={{ opacity: 0.3 }}>—</td>)}
                          <td>
                            <strong style={{ color: 'var(--success)' }}>
                              {formatCurrency(record.totalSales || 0)}
                            </strong>
                          </td>
                          <td>
                            <div className="table-actions">
                              {isEditing ? (
                                <>
                                  <Button variant="success" size="sm" onClick={() => handleSave(day)} disabled={saving}>
                                    {saving ? <Spinner size="sm" /> : <FaSave size={11} />}
                                  </Button>
                                  <Button variant="secondary" size="sm" onClick={() => setEditing(null)}><FaTimes size={11} /></Button>
                                </>
                              ) : isDeleted ? (
                                <>
                                  <Button variant="info" size="sm" onClick={() => handleRestore(record._id)} title="Restore"><FaUndo size={11} /></Button>
                                  <Button variant="danger" size="sm" onClick={() => setConfirm({ type: 'deleteRowPerm', id: record._id })} title="Delete Forever"><FaTrashAlt size={11} /></Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="primary" size="sm" onClick={() => startEdit(day)} title="Edit"><FaEdit size={11} /></Button>
                                  {record._id && (
                                    <Button variant="danger" size="sm" onClick={() => setConfirm({ type: 'deleteRow', id: record._id })} title="Delete"><FaTrash size={11} /></Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  {/* TOTALS ROW */}
                  <tr className="total-row sales-total">
                    <td><strong>WEEK TOTAL</strong></td>
                    {baseColumns.map(col => <td key={col.key}>{formatCurrency(totals[col.key])}</td>)}
                    {fields.map(f => <td key={f._id}>{formatCurrency(totals[`dyn_${f.fieldName}`])}</td>)}
                    {deletedFields.map(f => <td key={f._id}>—</td>)}
                    <td>{formatCurrency(grandTotal)}</td>
                    <td />
                  </tr>
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      </motion.div>

      <AddColumnModal show={showAddCol} type="sales" onSave={handleAddColumn} onHide={() => setShowAddCol(false)} />
      <AddRowModal show={showAddRow} type="sales" baseColumns={baseColumns} dynamicFields={fields}
        week={week} month={month} year={year} onSave={handleAddRow} onHide={() => setShowAddRow(false)} />
      {renameCol && <ColumnRenameModal show={!!renameCol} column={renameCol} onSave={handleRenameColumn} onHide={() => setRenameCol(null)} />}

      <ConfirmDialog
        show={!!confirm}
        title={confirm?.type?.includes('Perm') ? 'Permanently Delete?' : 'Delete?'}
        message={
          confirm?.type === 'deleteRow' ? 'This row will be soft-deleted and can be restored later.' :
          confirm?.type === 'deleteRowPerm' ? 'This row will be permanently deleted and cannot be recovered.' :
          confirm?.type === 'deleteCol' ? `Column "${confirm?.name}" will be hidden but can be restored.` :
          `Column "${confirm?.name}" will be permanently deleted.`
        }
        variant={confirm?.type?.includes('Perm') ? 'danger' : 'warning'}
        confirmText={confirm?.type?.includes('Perm') ? 'Delete Forever' : 'Delete'}
        onConfirm={() => {
          if (confirm?.type === 'deleteRow') handleDelete(confirm.id);
          else if (confirm?.type === 'deleteRowPerm') handleDelete(confirm.id, true);
          else if (confirm?.type === 'deleteCol') handleDeleteColumn(confirm.id);
          else if (confirm?.type === 'deleteColPerm') handleDeleteColumn(confirm.id, true);
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};

// =====================================================
// COSTS TABLE
// =====================================================
export const CostsTable = ({ week, month, year }) => {
  const [data, setData] = useState({});
  const [fields, setFields] = useState([]);
  const [deletedFields, setDeletedFields] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddCol, setShowAddCol] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);
  const [renameCol, setRenameCol] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const baseColumns = [
    { key: 'designMovies', label: 'Design & Movies' },
    { key: 'phoneParts', label: 'Phone Parts' },
    { key: 'laptopParts', label: 'Laptop Parts' },
    { key: 'electronicsParts', label: 'Electronics Parts' },
    { key: 'lunchMeals', label: 'Lunch / Meals' },
    { key: 'other', label: 'Other' }
  ];

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [costsRes, fieldsRes, deletedRes] = await Promise.all([
        costsService.getAll({ year, month, week, includeDeleted: showDeleted }),
        fieldService.getAll('costs'),
        fieldService.getAll('costs', true)
      ]);
      const organized = {};
      costsRes.data.data.forEach(r => { organized[r.day] = r; });
      setData(organized);
      setFields(fieldsRes.data.data);
      setDeletedFields(deletedRes.data.data.filter(f => !f.isActive));
    } catch {
      toast.error('Failed to fetch costs data');
    } finally {
      setLoading(false);
    }
  }, [week, month, year, showDeleted]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const startEdit = (day) => {
    const record = data[day] || {};
    const vals = {};
    baseColumns.forEach(col => { vals[col.key] = record[col.key] || 0; });
    fields.forEach(f => { vals[`dyn_${f.fieldName}`] = record.values?.get?.(f.fieldName) ?? record.values?.[f.fieldName] ?? 0; });
    setEditValues(vals);
    setEditing(day);
  };

  const handleSave = async (day) => {
    setSaving(true);
    try {
      const payload = { week, month, year, day };
      baseColumns.forEach(col => { payload[col.key] = parseFloat(editValues[col.key]) || 0; });
      const dynValues = {};
      fields.forEach(f => { dynValues[f.fieldName] = parseFloat(editValues[`dyn_${f.fieldName}`]) || 0; });
      payload.values = dynValues;
      await costsService.create(payload);
      toast.success(`✅ Saved ${day}`);
      await fetchAll();
      setEditing(null);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, permanent = false) => {
    try {
      if (permanent) await costsService.permanentDelete(id);
      else await costsService.delete(id);
      toast.success(permanent ? 'Permanently deleted' : 'Row deleted');
      fetchAll();
    } catch { toast.error('Failed to delete'); }
    setConfirm(null);
  };

  const handleRestore = async (id) => {
    try {
      await costsService.restore(id);
      toast.success('Row restored');
      fetchAll();
    } catch { toast.error('Failed to restore'); }
  };

  const handleAddColumn = async (colData) => {
    try {
      await fieldService.create({ ...colData, type: 'costs' });
      toast.success(`Column "${colData.fieldName}" added`);
      setShowAddCol(false);
      fetchAll();
    } catch { toast.error('Failed to add column'); }
  };

  const handleRenameColumn = async (newName) => {
    try {
      await fieldService.update(renameCol._id, { fieldName: newName });
      toast.success('Column renamed');
      setRenameCol(null);
      fetchAll();
    } catch { toast.error('Failed to rename'); }
  };

  const handleDeleteColumn = async (id, permanent = false) => {
    try {
      if (permanent) await fieldService.permanentDelete(id);
      else await fieldService.delete(id);
      toast.success(permanent ? 'Column permanently deleted' : 'Column hidden');
      fetchAll();
    } catch { toast.error('Failed to delete column'); }
    setConfirm(null);
  };

  const handleRestoreColumn = async (id) => {
    try {
      await fieldService.restore(id);
      toast.success('Column restored');
      fetchAll();
    } catch { toast.error('Failed to restore column'); }
  };

  const handleAddRow = async (rowData) => {
    try {
      const dynValues = {};
      fields.forEach(f => { dynValues[f.fieldName] = rowData[`dyn_${f.fieldName}`] || 0; delete rowData[`dyn_${f.fieldName}`]; });
      await costsService.create({ ...rowData, values: dynValues });
      toast.success('Row added');
      fetchAll();
    } catch { toast.error('Failed to add row'); }
  };

  const calcTotals = () => {
    const totals = {};
    baseColumns.forEach(c => totals[c.key] = 0);
    fields.forEach(f => totals[`dyn_${f.fieldName}`] = 0);
    let grandTotal = 0;
    Object.values(data).forEach(r => {
      if (r.isDeleted) return;
      baseColumns.forEach(c => { totals[c.key] += r[c.key] || 0; });
      fields.forEach(f => {
        const v = r.values?.get?.(f.fieldName) ?? r.values?.[f.fieldName] ?? 0;
        totals[`dyn_${f.fieldName}`] += v;
      });
      grandTotal += r.totalCosts || 0;
    });
    return { totals, grandTotal };
  };

  if (loading) return <Loader text="Loading costs data..." />;
  const { totals, grandTotal } = calcTotals();

  return (
    <>
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card>
          <Card.Header>
            <div>
              <h3>Daily Costs Summary</h3>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Week {week} · {month} {year}</small>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="secondary" size="sm" onClick={() => setShowDeleted(v => !v)}>
                {showDeleted ? <><FaEyeSlash size={11} className="me-1" />Hide Deleted</> : <><FaEye size={11} className="me-1" />Show Deleted</>}
              </Button>
              <Button variant="success" size="sm" onClick={() => setShowAddRow(true)}>
                <FaPlus size={11} className="me-1" />Add Row
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowAddCol(true)}>
                <FaColumns size={11} className="me-1" />Add Column
              </Button>
            </div>
          </Card.Header>
          <Card.Body style={{ padding: 0 }}>
            <div className="table-wrapper">
              <Table className="table-striped">
                <thead>
                  <tr>
                    <th>Day</th>
                    {baseColumns.map(col => <th key={col.key}>{col.label}</th>)}
                    {fields.map(f => (
                      <th key={f._id}>
                        <div className="col-header">
                          {f.fieldName}
                          <div className="col-actions">
                            <button className="col-action-btn edit" title="Rename" onClick={() => setRenameCol(f)}><FaEdit /></button>
                            <button className="col-action-btn delete" title="Remove" onClick={() => setConfirm({ type: 'deleteCol', id: f._id, name: f.fieldName })}><FaTrash /></button>
                          </div>
                        </div>
                      </th>
                    ))}
                    {deletedFields.length > 0 && deletedFields.map(f => (
                      <th key={f._id} style={{ opacity: 0.4 }}>
                        <div className="col-header">
                          <s>{f.fieldName}</s>
                          <div className="col-actions">
                            <button className="col-action-btn edit" title="Restore" onClick={() => handleRestoreColumn(f._id)}><FaUndo /></button>
                            <button className="col-action-btn delete" title="Delete Forever" onClick={() => setConfirm({ type: 'deleteColPerm', id: f._id, name: f.fieldName })}><FaTrashAlt /></button>
                          </div>
                        </div>
                      </th>
                    ))}
                    <th>Total Costs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {days.map((day, i) => {
                      const record = data[day] || {};
                      const isEditing = editing === day;
                      const isDeleted = record.isDeleted;

                      return (
                        <motion.tr key={day}
                          variants={rowVariant} custom={i}
                          initial="hidden" animate="visible" exit="exit"
                          className={isDeleted ? 'row-deleted' : isEditing ? 'editing-row' : ''}>
                          <td><strong style={{ color: '#f59e0b' }}>{day}</strong></td>
                          {baseColumns.map(col => (
                            <td key={col.key}>
                              {isEditing ? (
                                <Form.Control type="number" min="0" size="sm"
                                  value={editValues[col.key] ?? 0}
                                  onChange={e => setEditValues(v => ({ ...v, [col.key]: e.target.value }))} />
                              ) : (
                                <span style={{ color: record[col.key] > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                  {formatCurrency(record[col.key] || 0)}
                                </span>
                              )}
                            </td>
                          ))}
                          {fields.map(f => {
                            const val = record.values?.get?.(f.fieldName) ?? record.values?.[f.fieldName] ?? 0;
                            return (
                              <td key={f._id}>
                                {isEditing ? (
                                  <Form.Control type="number" min="0" size="sm"
                                    value={editValues[`dyn_${f.fieldName}`] ?? 0}
                                    onChange={e => setEditValues(v => ({ ...v, [`dyn_${f.fieldName}`]: e.target.value }))} />
                                ) : (
                                  <span style={{ color: val > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                    {formatCurrency(val)}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          {deletedFields.map(f => <td key={f._id} style={{ opacity: 0.3 }}>—</td>)}
                          <td>
                            <strong style={{ color: 'var(--danger)' }}>
                              {formatCurrency(record.totalCosts || 0)}
                            </strong>
                          </td>
                          <td>
                            <div className="table-actions">
                              {isEditing ? (
                                <>
                                  <Button variant="success" size="sm" onClick={() => handleSave(day)} disabled={saving}>
                                    {saving ? <Spinner size="sm" /> : <FaSave size={11} />}
                                  </Button>
                                  <Button variant="secondary" size="sm" onClick={() => setEditing(null)}><FaTimes size={11} /></Button>
                                </>
                              ) : isDeleted ? (
                                <>
                                  <Button variant="info" size="sm" onClick={() => handleRestore(record._id)}><FaUndo size={11} /></Button>
                                  <Button variant="danger" size="sm" onClick={() => setConfirm({ type: 'deleteRowPerm', id: record._id })}><FaTrashAlt size={11} /></Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="warning" size="sm" onClick={() => startEdit(day)}><FaEdit size={11} /></Button>
                                  {record._id && (
                                    <Button variant="danger" size="sm" onClick={() => setConfirm({ type: 'deleteRow', id: record._id })}><FaTrash size={11} /></Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  <tr className="total-row costs-total">
                    <td><strong>WEEK TOTAL</strong></td>
                    {baseColumns.map(col => <td key={col.key}>{formatCurrency(totals[col.key])}</td>)}
                    {fields.map(f => <td key={f._id}>{formatCurrency(totals[`dyn_${f.fieldName}`])}</td>)}
                    {deletedFields.map(f => <td key={f._id}>—</td>)}
                    <td>{formatCurrency(grandTotal)}</td>
                    <td />
                  </tr>
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      </motion.div>

      <AddColumnModal show={showAddCol} type="costs" onSave={handleAddColumn} onHide={() => setShowAddCol(false)} />
      <AddRowModal show={showAddRow} type="costs" baseColumns={baseColumns} dynamicFields={fields}
        week={week} month={month} year={year} onSave={handleAddRow} onHide={() => setShowAddRow(false)} />
      {renameCol && <ColumnRenameModal show={!!renameCol} column={renameCol} onSave={handleRenameColumn} onHide={() => setRenameCol(null)} />}

      <ConfirmDialog
        show={!!confirm}
        title={confirm?.type?.includes('Perm') ? 'Permanently Delete?' : 'Delete?'}
        message={
          confirm?.type === 'deleteRow' ? 'Row will be soft-deleted and can be restored.' :
          confirm?.type === 'deleteRowPerm' ? 'Row will be permanently deleted.' :
          confirm?.type === 'deleteCol' ? `Column "${confirm?.name}" will be hidden.` :
          `Column "${confirm?.name}" will be permanently deleted.`
        }
        variant={confirm?.type?.includes('Perm') ? 'danger' : 'warning'}
        confirmText={confirm?.type?.includes('Perm') ? 'Delete Forever' : 'Delete'}
        onConfirm={() => {
          if (confirm?.type === 'deleteRow') handleDelete(confirm.id);
          else if (confirm?.type === 'deleteRowPerm') handleDelete(confirm.id, true);
          else if (confirm?.type === 'deleteCol') handleDeleteColumn(confirm.id);
          else if (confirm?.type === 'deleteColPerm') handleDeleteColumn(confirm.id, true);
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};

// =====================================================
// CUSTOM TOOLTIP FOR CHARTS
// =====================================================
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,15,30,0.97)', border: '1px solid rgba(102,126,234,0.3)',
      borderRadius: 10, padding: '12px 16px', fontSize: '0.82rem', minWidth: 160
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// =====================================================
// STATISTICS
// =====================================================
export const Statistics = ({ year, month, week }) => {
  const [profitData, setProfitData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [summary, setSummary] = useState({ sales: 0, costs: 0, profit: 0, margin: 0 });
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('line');

  const COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e'];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [salesRes, costsRes, reportRes] = await Promise.all([
        salesService.getAll({ year, month, week }),
        costsService.getAll({ year, month, week }),
        reportService.getWeekly({ year, week })
      ]);

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const daily = days.map(day => {
        const s = salesRes.data.data.find(d => d.day === day && !d.isDeleted)?.totalSales || 0;
        const c = costsRes.data.data.find(d => d.day === day && !d.isDeleted)?.totalCosts || 0;
        return { name: day, Sales: s, Costs: c, Profit: s - c };
      });
      setProfitData(daily);

      const totalSales = daily.reduce((sum, d) => sum + d.Sales, 0);
      const totalCosts = daily.reduce((sum, d) => sum + d.Costs, 0);
      const totalProfit = totalSales - totalCosts;
      setSummary({ sales: totalSales, costs: totalCosts, profit: totalProfit, margin: calculateProfitMargin(totalSales, totalCosts) });

      const categories = [];
      if (reportRes.data.data?.categoryBreakdown?.sales) {
        for (let [key, value] of Object.entries(reportRes.data.data.categoryBreakdown.sales)) {
          if (value > 0) categories.push({ name: key, value });
        }
      }
      setCategoryData(categories);
    } catch {
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  }, [year, month, week]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statCards = [
    { cls: 'sales', label: 'Total Sales', val: summary.sales, icon: <FaChartLine />, sub: `Week ${week}` },
    { cls: 'costs', label: 'Total Costs', val: summary.costs, icon: <FaMoneyBillWave />, sub: `Week ${week}` },
    { cls: 'profit', label: 'Net Profit', val: summary.profit, icon: <FaDollarSign />, sub: `${summary.margin.toFixed(1)}% margin` },
    { cls: 'margin', label: 'Profit Margin', val: null, icon: <FaPercent />, sub: 'Revenue efficiency', marginVal: summary.margin }
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      {/* Stat Cards */}
      <Row className="mb-4 g-3">
        {statCards.map((card, i) => (
          <Col key={card.cls} md={6} xl={3}>
            <motion.div variants={fadeUp} custom={i} initial="hidden" animate="visible">
              <div className={`stat-card ${card.cls}`}>
                <div className="stat-icon">{card.icon}</div>
                <h6>{card.label}</h6>
                <h3 className={card.cls === 'profit' ? (summary.profit >= 0 ? 'profit-positive' : 'profit-negative') : ''}>
                  {card.marginVal !== undefined ? `${card.marginVal.toFixed(1)}%` : formatCurrency(card.val)}
                </h3>
                <small>{card.sub}</small>
              </div>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Profit Summary Bar */}
      <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible" className="mb-4">
        <Card>
          <Card.Body style={{ padding: '18px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>WEEKLY PROFIT CALCULATION</p>
                <div style={{ display: 'flex', gap: 24, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Sales: <strong style={{ color: '#10b981' }}>{formatCurrency(summary.sales)}</strong></span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Costs: <strong style={{ color: '#ef4444' }}>{formatCurrency(summary.costs)}</strong></span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Profit = Sales − Costs = <strong style={{ color: summary.profit >= 0 ? '#10b981' : '#ef4444', fontSize: '1rem' }}>{formatCurrency(summary.profit)}</strong>
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['line', 'bar', 'area'].map(t => (
                  <Button key={t} variant={chartType === t ? 'primary' : 'secondary'} size="sm"
                    onClick={() => setChartType(t)} style={{ textTransform: 'capitalize' }}>{t}</Button>
                ))}
              </div>
            </div>
          </Card.Body>
        </Card>
      </motion.div>

      {/* Charts */}
      <Row className="g-3">
        <Col lg={8}>
          <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible">
            <Card>
              <Card.Header>
                <h5>Daily Profit Analysis</h5>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Sales vs Costs vs Profit</small>
              </Card.Header>
              <Card.Body style={{ height: 340, padding: '16px' }}>
                {loading ? <Loader /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                      <AreaChart data={profitData}>
                        <defs>
                          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="costsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                        <RechartTooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                        <Area type="monotone" dataKey="Sales" stroke="#10b981" fill="url(#salesGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="Costs" stroke="#ef4444" fill="url(#costsGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="Profit" stroke="#667eea" fill="url(#profitGrad)" strokeWidth={2} />
                      </AreaChart>
                    ) : chartType === 'bar' ? (
                      <BarChart data={profitData} barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                        <RechartTooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                        <Bar dataKey="Sales" fill="#10b981" radius={[4,4,0,0]} />
                        <Bar dataKey="Costs" fill="#ef4444" radius={[4,4,0,0]} />
                        <Bar dataKey="Profit" fill="#667eea" radius={[4,4,0,0]} />
                      </BarChart>
                    ) : (
                      <LineChart data={profitData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                        <RechartTooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                        <Line type="monotone" dataKey="Sales" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Costs" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Profit" stroke="#667eea" strokeWidth={3} dot={{ r: 4, fill: '#667eea' }} activeDot={{ r: 7 }} strokeDasharray="0" />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}
              </Card.Body>
            </Card>
          </motion.div>
        </Col>

        <Col lg={4}>
          <motion.div variants={fadeUp} custom={6} initial="hidden" animate="visible">
            <Card style={{ height: '100%' }}>
              <Card.Header>
                <h5>Sales Breakdown</h5>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>By category</small>
              </Card.Header>
              <Card.Body style={{ height: 340, padding: '16px' }}>
                {loading ? <Loader /> : categoryData.length === 0 ? (
                  <div className="empty-state"><p>No data for this period</p></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="45%" outerRadius={100} innerRadius={50}
                        dataKey="value" paddingAngle={3} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}>
                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartTooltip formatter={v => formatCurrency(v)} contentStyle={{ background: 'rgba(10,15,30,0.97)', border: '1px solid rgba(102,126,234,0.3)', borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card.Body>
            </Card>
          </motion.div>
        </Col>
      </Row>
    </motion.div>
  );
};

// =====================================================
// DASHBOARD
// =====================================================
export const Dashboard = () => {
  const currentDate = new Date();
  const week = Math.ceil(currentDate.getDate() / 7);
  const month = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  const dayName = currentDate.toLocaleString('default', { weekday: 'long' });
  const dateStr = currentDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Container fluid className="py-4" style={{ maxWidth: 1600 }}>
      {/* Page header */}
      <motion.div variants={slideLeft} initial="hidden" animate="visible" className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 className="rotating-gradient" style={{ WebkitTextFillColor: undefined, background: 'linear-gradient(135deg, #667eea, #764ba2, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SmartEdge Electronics
            </h2>
            <p>{dayName}, {dateStr} · Week {week} · {month} {year}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live</span>
          </div>
        </div>
      </motion.div>

      {/* Statistics */}
      <Statistics year={year} month={month} week={week} />

      {/* Tables */}
      <Row className="mt-4 g-4">
        <Col xl={6}>
          <SalesTable week={week} month={month} year={year} />
        </Col>
        <Col xl={6}>
          <CostsTable week={week} month={month} year={year} />
        </Col>
      </Row>
    </Container>
  );
};

// =====================================================
// LOGIN
// =====================================================
export const Login = ({ onLogin }) => {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authService.login({ staffId: staffId.toUpperCase(), password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.data));
      toast.success(`Welcome back, ${res.data.data.name}! 👋`);
      onLogin(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <AnimatePresence>
        <motion.div className="login-card" variants={scaleIn} initial="hidden" animate="visible">
          <Card>
            <Card.Header style={{ textAlign: 'center', padding: '32px 32px 24px' }}>
              
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  SmartEdge Electronics
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Sales & Profit Tracking</p>
              </motion.div>
            </Card.Header>
            <Card.Body style={{ padding: '28px 32px' }}>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Alert variant="danger" style={{ marginBottom: 20 }}><FaExclamationTriangle className="me-2" />{error}</Alert>
                  </motion.div>
                )}
              </AnimatePresence>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Staff ID</Form.Label>
                  <Form.Control type="text" value={staffId}
                    onChange={e => setStaffId(e.target.value.toUpperCase())}
                    placeholder="e.g. S100" required autoFocus />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <div style={{ position: 'relative' }}>
                    <Form.Control type={showPwd ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password" required />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {showPwd ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                </Form.Group>
                <Button type="submit" variant="primary" className="w-100 btn-lg" disabled={loading}>
                  {loading ? <><Spinner size="sm" className="me-2" />Signing in...</> : 'Sign In'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// =====================================================
// DYNAMIC FIELDS SETTINGS
// =====================================================
export const DynamicFieldsSettings = () => {
  const [fields, setFields] = useState({ sales: [], costs: [] });
  const [deletedFields, setDeletedFields] = useState({ sales: [], costs: [] });
  const [showAddCol, setShowAddCol] = useState(null);
  const [renameCol, setRenameCol] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [sRes, cRes, sdRes, cdRes] = await Promise.all([
        fieldService.getAll('sales'),
        fieldService.getAll('costs'),
        fieldService.getAll('sales', true),
        fieldService.getAll('costs', true)
      ]);
      setFields({ sales: sRes.data.data, costs: cRes.data.data });
      setDeletedFields({
        sales: sdRes.data.data.filter(f => !f.isActive),
        costs: cdRes.data.data.filter(f => !f.isActive)
      });
    } catch { toast.error('Failed to load fields'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAdd = async (data) => {
    try {
      await fieldService.create(data);
      toast.success(`"${data.fieldName}" column added`);
      setShowAddCol(null); fetchAll();
    } catch { toast.error('Failed to add column'); }
  };

  const handleRename = async (name) => {
    try {
      await fieldService.update(renameCol._id, { fieldName: name });
      toast.success('Column renamed');
      setRenameCol(null); fetchAll();
    } catch { toast.error('Failed to rename'); }
  };

  const handleDelete = async (id, permanent) => {
    try {
      if (permanent) await fieldService.permanentDelete(id);
      else await fieldService.delete(id);
      toast.success(permanent ? 'Permanently deleted' : 'Column hidden');
      fetchAll();
    } catch { toast.error('Failed to delete'); }
    setConfirm(null);
  };

  const handleRestore = async (id) => {
    try {
      await fieldService.restore(id);
      toast.success('Column restored'); fetchAll();
    } catch { toast.error('Failed to restore'); }
  };

  const FieldTable = ({ type, list, deleted }) => (
    <Card className="mb-3">
      <Card.Header>
        <h5 style={{ textTransform: 'capitalize' }}>{type} Columns</h5>
        <Button variant="primary" size="sm" onClick={() => setShowAddCol(type)}>
          <FaPlus size={11} className="me-1" />Add Column
        </Button>
      </Card.Header>
      <Card.Body style={{ padding: 0 }}>
        {list.length === 0 && deleted.length === 0 ? (
          <div className="empty-state"><p>No custom columns yet</p></div>
        ) : (
          <Table className="table-striped" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Column Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((f, i) => (
                <motion.tr key={f._id} variants={rowVariant} custom={i} initial="hidden" animate="visible">
                  <td><strong>{f.fieldName}</strong></td>
                  <td><span className="badge" style={{ background: 'rgba(102,126,234,0.15)', color: 'var(--primary)' }}>{f.fieldType}</span></td>
                  <td><span style={{ color: '#10b981', fontSize: '0.8rem' }}>● Active</span></td>
                  <td>
                    <div className="table-actions">
                      <Button variant="primary" size="sm" onClick={() => setRenameCol(f)}><FaEdit size={11} /></Button>
                      <Button variant="warning" size="sm" onClick={() => setConfirm({ id: f._id, name: f.fieldName, perm: false })}>
                        <FaEyeSlash size={11} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setConfirm({ id: f._id, name: f.fieldName, perm: true })}>
                        <FaTrash size={11} />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {deleted.map((f, i) => (
                <motion.tr key={f._id} className="row-deleted" variants={rowVariant} custom={list.length + i} initial="hidden" animate="visible">
                  <td><s>{f.fieldName}</s></td>
                  <td><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{f.fieldType}</span></td>
                  <td><span style={{ color: '#ef4444', fontSize: '0.8rem' }}>● Hidden</span></td>
                  <td>
                    <div className="table-actions">
                      <Button variant="info" size="sm" onClick={() => handleRestore(f._id)} title="Restore"><FaUndo size={11} /></Button>
                      <Button variant="danger" size="sm" onClick={() => setConfirm({ id: f._id, name: f.fieldName, perm: true })} title="Delete Forever"><FaTrashAlt size={11} /></Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );

  if (loading) return <Loader text="Loading settings..." />;

  return (
    <Container fluid className="py-4" style={{ maxWidth: 1000 }}>
      <motion.div variants={slideLeft} initial="hidden" animate="visible" className="page-header">
        <h2>Column Settings</h2>
        <p>Manage dynamic columns for sales and costs tables</p>
      </motion.div>

      <FieldTable type="sales" list={fields.sales} deleted={deletedFields.sales} />
      <FieldTable type="costs" list={fields.costs} deleted={deletedFields.costs} />

      {showAddCol && (
        <AddColumnModal show={!!showAddCol} type={showAddCol} onSave={handleAdd} onHide={() => setShowAddCol(null)} />
      )}
      {renameCol && (
        <ColumnRenameModal show={!!renameCol} column={renameCol} onSave={handleRename} onHide={() => setRenameCol(null)} />
      )}
      <ConfirmDialog
        show={!!confirm}
        title={confirm?.perm ? 'Permanently Delete Column?' : 'Hide Column?'}
        message={confirm?.perm
          ? `"${confirm?.name}" will be permanently deleted and all its data will be lost.`
          : `"${confirm?.name}" will be hidden from tables but can be restored.`}
        variant={confirm?.perm ? 'danger' : 'warning'}
        confirmText={confirm?.perm ? 'Delete Forever' : 'Hide Column'}
        onConfirm={() => handleDelete(confirm.id, confirm.perm)}
        onCancel={() => setConfirm(null)}
      />
    </Container>
  );
};