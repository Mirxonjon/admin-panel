import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Fuel,
  Wallet,
  Power,
  CheckCircle2,
  TrendingUp,
  DropletIcon,
  Zap,
  BarChart2,
  Clock,
  CreditCard,
  Award,
  Phone,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStation } from '../context/StationContext';
import { apiFetch } from '../../core/api/apiFetch';
import { useToastStore } from '../store/useToastStore';
import { getUserFriendlyErrorMessage } from '../../core/api/userFriendlyError';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import '../styles/layout.css';

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? new Intl.NumberFormat('ru-RU').format(n) : '0';
};
const fmt = (v) => new Intl.NumberFormat('ru-RU').format(Math.round(Number(v) || 0));
const formatUnit = (unit) => {
  const u = String(unit || '').toUpperCase();
  if (u === 'LITRE') return 'л';
  if (u === 'M3') return 'м³';
  if (u === 'KG') return 'кг';
  return unit || 'л';
};
const statusLabel = (status, t) => {
  const s = String(status || '').toUpperCase();
  if (s === 'PENDING') return t('paid_orders');
  if (s === 'ACTIVE') return t('fueling_orders');
  if (s === 'COMPLETED') return t('status_completed');
  if (s === 'CANCELLED') return t('status_cancelled');
  if (s === 'FAILED') return t('error_unknown');
  return s;
};

// ─── Colors ───────────────────────────────────────────────────────────────────

const FUEL_COLORS = { 'AI-80': '#f59e0b', 'AI-92': '#3b82f6', 'AI-95': '#10b981', 'Methane': '#8b5cf6', 'Propane': '#ef4444' };
const fuelColor = (name) => FUEL_COLORS[name] || '#64748b';
const PAYMENT_COLORS = { CLICK: '#3b82f6', PAYME: '#10b981', CARD: '#8b5cf6', OTHER: '#64748b' };
const paymentColor = (key) => PAYMENT_COLORS[key] || '#64748b';

// ─── NodeCard ─────────────────────────────────────────────────────────────────

const NodeCard = ({ session, fuelTypeName, pumpNumber, onConfirm, onFinish, actioning }) => {
  const { t } = useTranslation();
  const status = String(session?.status || '').toUpperCase();
  const isPending = status === 'PENDING';
  const isActive = status === 'ACTIVE';

  const renderContent = () => {
    if (isPending) {
      return (
        <div className="paid-checkout-card">
          <div className="checkout-summary">
            <span className="checkout-label">{t('total_transaction')}</span>
            <div className="checkout-amount-group">
              <span className="amount">{formatMoney(session?.totalAmount)} UZS</span>
            </div>
          </div>
          <button className="confirm-payout-btn premium" onClick={() => onConfirm(session?.id)} disabled={actioning}>
            <CheckCircle2 size={18} />
            {actioning ? (t('loading') || '...') : t('confirm_payout').toUpperCase()}
          </button>
        </div>
      );
    }
    if (isActive) {
      return (
        <div className="busy-status-card">
          <div className="busy-metrics">
            <div className="busy-metric-item">
              <span className="busy-label">{t('liters_dispensed')}</span>
              <div className="busy-value">
                {session?.quantity ?? 0} <span className="unit">{formatUnit(session?.unit)}</span>
              </div>
            </div>
            <div className="busy-metric-item align-right">
              <span className="busy-label">{t('est_billing')}</span>
              <div className="busy-value price">{formatMoney(session?.totalAmount)} UZS</div>
            </div>
          </div>
          <button className="node-action-btn finish-highlight" onClick={() => onFinish(session?.id)} disabled={actioning}>
            <CheckCircle2 size={16} />
            {actioning ? (t('loading') || '...') : t('finish_order').toUpperCase()}
          </button>
        </div>
      );
    }
    return (
      <div className="ready-placeholder">
        <div className="ready-icon-bg"><Power size={22} /></div>
        <span className="ready-text">{statusLabel(status, t)}</span>
      </div>
    );
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`node-monitor-card ${isActive ? 'busy' : isPending ? 'paid' : 'ready'}`}>
      <div className="node-monitor-header">
        <div className="node-info-main">
          <div className={`node-icon-status ${isActive ? 'active' : ''}`}>
            {isActive ? <Fuel size={20} /> : isPending ? <Wallet size={20} /> : <Power size={20} />}
          </div>
          <div className="node-title-group">
            <span className="node-number">{String(pumpNumber ?? session?.fuelPumpId ?? '--').padStart(2, '0')}</span>
            <span className="node-fuel-type">{fuelTypeName}</span>
          </div>
        </div>
        <span className={`status-pill ${isActive ? 'busy' : isPending ? 'paid' : 'ready'}`}>
          {statusLabel(status, t).toUpperCase()}
        </span>
      </div>
      <div className="node-content-area">{renderContent()}</div>
    </motion.div>
  );
};

// ─── Stats helpers ────────────────────────────────────────────────────────────

const StatMiniCard = ({ icon, label, value, sub, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: 'spring', stiffness: 400, damping: 30 }}
    style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', boxShadow: '0 3px 16px rgba(0,0,0,0.04)', padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}
  >
    <div style={{ width: 44, height: 44, minWidth: 44, borderRadius: 13, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1.2, marginTop: 3 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, fontWeight: 500 }}>{sub}</div>}
    </div>
  </motion.div>
);

const SectionCard = ({ title, icon, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: 'spring', stiffness: 350, damping: 28 }}
    style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', boxShadow: '0 3px 16px rgba(0,0,0,0.04)', padding: '18px 20px' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{title}</div>
    </div>
    {children}
  </motion.div>
);

const EmptyChart = () => {
  const { t } = useTranslation();
  return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
      {t('no_data')}
    </div>
  );
};

// ─── DonutChart ───────────────────────────────────────────────────────────────

const DonutChartSVG = ({ segments, totalLabel }) => {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (!total) return <EmptyChart />;
  let angle = -90;
  const R = 52, r = 32, cx = 66, cy = 66;
  const arcs = segments.map((seg) => {
    const pct = seg.value / total;
    const deg = pct * 360;
    const rad1 = (angle * Math.PI) / 180, rad2 = ((angle + deg) * Math.PI) / 180;
    const x1 = cx + R * Math.cos(rad1), y1 = cy + R * Math.sin(rad1);
    const x2 = cx + R * Math.cos(rad2), y2 = cy + R * Math.sin(rad2);
    const x3 = cx + r * Math.cos(rad2), y3 = cy + r * Math.sin(rad2);
    const x4 = cx + r * Math.cos(rad1), y4 = cy + r * Math.sin(rad1);
    const d = `M${x1},${y1} A${R},${R},0,${deg > 180 ? 1 : 0},1,${x2},${y2} L${x3},${y3} A${r},${r},0,${deg > 180 ? 1 : 0},0,${x4},${y4} Z`;
    angle += deg;
    return { ...seg, d, pct };
  });
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 132 132" style={{ width: 110, height: 110, flexShrink: 0 }}>
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} opacity={0.9}><title>{`${a.label}: ${Math.round(a.pct * 100)}%`}</title></path>)}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={800} fill="#0f172a">{totalLabel}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {arcs.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{a.label}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{Math.round(a.pct * 100)}% • {fmt(a.value)} UZS</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── PumpBreakdown ────────────────────────────────────────────────────────────

const PumpBreakdown = ({ data }) => {
  const entries = Object.entries(data || {});
  if (!entries.length) return <EmptyChart />;
  const total = entries.reduce((s, [, v]) => s + (v.amount || 0), 0);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entries.map(([name, val], i) => {
        const pct = total ? (val.amount / total) * 100 : 0;
        return (
          <div key={name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{name}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>{fmt(val.amount)} UZS • {val.count} {val.count === 1 ? 'сес.' : 'сес.'}</span>
            </div>
            <div style={{ height: 7, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: colors[i % colors.length], borderRadius: 8, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── PeakHours ────────────────────────────────────────────────────────────────

const PeakHoursBar = ({ data }) => {
  const hours = Array.isArray(data) ? data : [];
  if (!hours.length) return <EmptyChart />;
  const maxCount = Math.max(...hours.map((h) => h.count), 1);
  const all24 = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: hours.find((h) => h.hour === i)?.count || 0 }));
  return (
    <>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 56 }}>
        {all24.map((h) => {
          const pct = (h.count / maxCount) * 100;
          const isActive = h.count > 0;
          return (
            <div key={h.hour} title={`${String(h.hour).padStart(2, '0')}:00 — ${h.count} сессий`}
              style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' }}>
              <div style={{ width: '100%', height: `${Math.max(pct, isActive ? 10 : 2)}%`, minHeight: isActive ? 8 : 2, background: isActive ? '#3b82f6' : '#e2e8f0', borderRadius: 3, transition: 'all 0.4s' }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>00:00</span>
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>12:00</span>
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>23:00</span>
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {hours.slice().sort((a, b) => b.count - a.count).slice(0, 3).map((h) => (
          <div key={h.hour} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{String(h.hour).padStart(2, '0')}:00</span>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{h.count}</span>
          </div>
        ))}
      </div>
    </>
  );
};

// ─── Auto-aggregate + BarChart ────────────────────────────────────────────────

const aggregateData = (raw, valueKey) => {
  if (!raw.length) return { items: [], mode: 'daily' };
  if (raw.length <= 14) return { items: raw, mode: 'daily' };
  if (raw.length <= 60) {
    const map = new Map();
    raw.forEach((d) => {
      const date = new Date(d.date);
      const day = date.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const mon = new Date(date);
      mon.setDate(date.getDate() + diff);
      const key = mon.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, { date: key, [valueKey]: 0, quantity: 0 });
      const e = map.get(key);
      e[valueKey] += Number(d[valueKey]) || 0;
      e.quantity += Number(d.quantity) || 0;
    });
    return { items: Array.from(map.values()), mode: 'weekly' };
  }
  const map = new Map();
  raw.forEach((d) => {
    const key = d.date.slice(0, 7);
    if (!map.has(key)) map.set(key, { date: key, [valueKey]: 0, quantity: 0 });
    const e = map.get(key);
    e[valueKey] += Number(d[valueKey]) || 0;
    e.quantity += Number(d.quantity) || 0;
  });
  return { items: Array.from(map.values()), mode: 'monthly' };
};

const MODE_LABEL = { daily: 'chart_daily', weekly: 'chart_weekly', monthly: 'chart_monthly' };

const BarChartSVG = ({ data, valueKey, labelKey, color, height }) => {
  const { t, i18n } = useTranslation();
  const { items, mode } = aggregateData(data || [], valueKey);
  if (!items.length) return <EmptyChart />;
  const maxVal = Math.max(...items.map((d) => Number(d[valueKey]) || 0), 1);
  const rawStep = maxVal / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const niceStep = Math.ceil((rawStep || 1) / mag) * mag;
  const ticks = Array.from({ length: 5 }, (_, i) => i * niceStep).filter((t) => t <= maxVal * 1.15);
  const PAD_LEFT = 54, PAD_RIGHT = 6, PAD_TOP = 6, PAD_BOTTOM = 26, chartH = height;
  const barGap = mode === 'monthly' ? 10 : 6;
  const barW = Math.max(12, Math.floor((520 - items.length * barGap) / items.length));
  const chartW = items.length * (barW + barGap) - barGap;
  const totalW = chartW + PAD_LEFT + PAD_RIGHT;
  const totalH = chartH + PAD_TOP + PAD_BOTTOM;
  const yPos = (v) => PAD_TOP + chartH - (v / (ticks[ticks.length - 1] || maxVal)) * chartH;
  const fmtTick = (v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${Math.round(v / 1_000)}K` : String(v);
  const xLabel = (s) => {
    if (mode === 'monthly') {
      const date = new Date(s + '-01');
      return new Intl.DateTimeFormat(i18n.language, { month: 'short', year: '2-digit' }).format(date);
    }
    return mode === 'weekly' ? `↑${s.slice(5)}` : s.slice(5);
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 5, padding: '1px 7px' }}>
          {t(MODE_LABEL[mode])}
        </span>
      </div>
      <svg viewBox={`0 0 ${totalW} ${totalH}`} style={{ width: '100%', height: totalH, overflow: 'visible' }}>
        <defs>
          <linearGradient id="dashBG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {ticks.map((tick, i) => {
          const y = yPos(tick);
          return (
            <g key={i}>
              <line x1={PAD_LEFT} y1={y} x2={PAD_LEFT + chartW} y2={y} stroke={tick === 0 ? '#cbd5e1' : '#f1f5f9'} strokeWidth={tick === 0 ? 1.5 : 1} strokeDasharray={tick === 0 ? '' : '4 3'} />
              <text x={PAD_LEFT - 7} y={y + 4} textAnchor="end" fontSize={9.5} fill="#94a3b8" fontWeight={600}>{fmtTick(tick)}</text>
            </g>
          );
        })}
        {items.map((item, i) => {
          const val = Number(item[valueKey]) || 0;
          const topTick = ticks[ticks.length - 1] || maxVal;
          const barH = Math.max(4, (val / topTick) * chartH);
          const x = PAD_LEFT + i * (barW + barGap);
          const y = PAD_TOP + chartH - barH;
          return (
            <g key={i}>
              <rect x={x + 1} y={y + 3} width={barW} height={barH} rx={4} fill={color} opacity={0.07} />
              <rect x={x} y={y} width={barW} height={barH} rx={4} fill="url(#dashBG)" opacity={0.9} style={{ cursor: 'pointer' }}>
                <title>{`${item.date}: ${fmtTick(val)} UZS`}</title>
              </rect>
              {barH > 24 && <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={8.5} fill={color} fontWeight={800} opacity={0.8}>{fmtTick(val)}</text>}
              <text x={x + barW / 2} y={PAD_TOP + chartH + PAD_BOTTOM - 5} textAnchor="middle" fontSize={mode === 'monthly' ? 9.5 : 9} fill="#94a3b8" fontWeight={600}>{xLabel(String(item.date || ''))}</text>
            </g>
          );
        })}
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={PAD_TOP + chartH} stroke="#e2e8f0" strokeWidth={1.5} />
      </svg>
    </div>
  );
};

// ─── Date presets ─────────────────────────────────────────────────────────────

const PRESETS = [
  { key: 'preset_7d', days: 7 },
  { key: 'preset_30d', days: 30 },
  { key: 'preset_90d', days: 90 },
  { key: 'preset_all', days: 365 * 3 },
];
const toDateStr = (d) => d.toISOString().slice(0, 10);

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { t } = useTranslation();
  const { selectedStation } = useStation();
  const toastError = useToastStore((s) => s.error);
  const selectedStationId = selectedStation?.id ?? null;

  // ── Live sessions state ──
  const [sessions, setSessions] = useState([]);
  const [fuelTypeMap, setFuelTypeMap] = useState({});
  const [pumpMap, setPumpMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const loadingRef = useRef(false);

  // ── Stats state ──
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activePreset, setActivePreset] = useState(1); // 30 дн.
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return toDateStr(d); });
  const [to, setTo] = useState(() => toDateStr(new Date()));

  const applyPreset = (idx) => {
    setActivePreset(idx);
    const d = new Date();
    setFrom(toDateStr(new Date(d.getTime() - PRESETS[idx].days * 86400000)));
    setTo(toDateStr(d));
  };

  // ── Load live data ──
  const loadDashboardData = async ({ silent = false } = {}) => {
    if (!selectedStationId) { setSessions([]); return; }
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!silent) setLoading(true);
    try {
      const [sessionsRes, fuelTypesRes, pumpsRes] = await Promise.all([
        apiFetch('v1/fuel-sessions/admin', { method: 'GET', params: { page: 1, limit: 100, fuelStationId: selectedStationId } }),
        apiFetch('v1/fuel-types', { method: 'GET' }),
        apiFetch('v1/pumps', { method: 'GET', params: { page: 1, limit: 100, stationId: selectedStationId } }),
      ]);
      setSessions(Array.isArray(sessionsRes?.data?.items) ? sessionsRes.data.items : []);
      const fuels = Array.isArray(fuelTypesRes?.data?.items) ? fuelTypesRes.data.items : (Array.isArray(fuelTypesRes?.data) ? fuelTypesRes.data : []);
      setFuelTypeMap(fuels.reduce((acc, it) => { acc[it.id] = it?.name || `Fuel #${it.id}`; return acc; }, {}));
      const pumps = Array.isArray(pumpsRes?.data?.items) ? pumpsRes.data.items : [];
      setPumpMap(pumps.reduce((acc, it) => { acc[it.id] = it?.fuelPumpNumber ?? it?.id; return acc; }, {}));
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err, t));
    } finally {
      loadingRef.current = false;
      if (!silent) setLoading(false);
    }
  };

  // ── Load stats ──
  const fetchStats = useCallback(async () => {
    if (!selectedStationId) return;
    setStatsLoading(true);
    try {
      const res = await apiFetch('v1/fuel-sessions/cashier/stats', {
        method: 'GET',
        params: { from, to, fuelStationId: selectedStationId },
      });
      setStats(res?.data ?? null);
    } catch (err) {
      // silent — stats panel just stays empty
    } finally {
      setStatsLoading(false);
    }
  }, [selectedStationId, from, to]);

  useEffect(() => {
    loadDashboardData();
    const id = setInterval(() => { if (document.visibilityState !== 'visible') return; loadDashboardData({ silent: true }); }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Derived session data ──
  const pendingSessions = useMemo(() => sessions.filter((s) => String(s?.status || '').toUpperCase() === 'PENDING'), [sessions]);
  const activeSessions = useMemo(() => sessions.filter((s) => String(s?.status || '').toUpperCase() === 'ACTIVE'), [sessions]);
  const completedSessions = useMemo(() => sessions.filter((s) => String(s?.status || '').toUpperCase() === 'COMPLETED'), [sessions]);
  const cancelledCount = useMemo(() => sessions.filter((s) => ['CANCELLED', 'FAILED'].includes(String(s?.status || '').toUpperCase())).length, [sessions]);
  const activeCount = pendingSessions.length + activeSessions.length;

  const updateStatus = async (id, status) => {
    if (!id) return;
    setActioningId(id);
    try {
      await apiFetch(`v1/fuel-sessions/${id}/status`, { method: 'PATCH', body: { status } });
      await loadDashboardData({ silent: true });
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err, t));
    } finally {
      setActioningId(null);
    }
  };

  // ── Derived stats data ──
  const overview = stats?.overview ?? {};
  const byFuelType = stats?.byFuelType ?? {};
  const byPump = stats?.byPump ?? {};
  const dailySales = stats?.dailySales ?? [];
  const peakHours = stats?.peakHours ?? [];
  const topCustomers = stats?.topCustomers ?? [];
  const paymentMethods = stats?.paymentMethods ?? {};

  const fuelTypeSegments = useMemo(
    () => Object.entries(byFuelType).map(([name, v]) => ({ label: name, value: v.amount, color: fuelColor(name) })),
    [byFuelType]
  );
  const paymentSegments = useMemo(
    () => Object.entries(paymentMethods).map(([key, v]) => ({ label: key, value: v.amount, color: paymentColor(key) })),
    [paymentMethods]
  );

  return (
    <div className="dashboard-container">

      {/* ══════ Live session grid ══════ */}
      <div className="command-center-grid">
        {loading && sessions.length === 0 ? <div style={{ color: '#64748b', padding: 8 }}>{t('loading')}</div> : null}
        {[...pendingSessions, ...activeSessions].map((session) => (
          <NodeCard
            key={session.id}
            session={session}
            fuelTypeName={fuelTypeMap[session?.fuelTypeId] || `Fuel #${session?.fuelTypeId ?? '—'}`}
            pumpNumber={pumpMap[session?.fuelPumpId] ?? session?.fuelPumpId}
            onConfirm={(id) => updateStatus(id, 'ACTIVE')}
            onFinish={(id) => updateStatus(id, 'COMPLETED')}
            actioning={actioningId === session.id}
          />
        ))}
      </div>

      {/* ══════ Stats header ══════ */}
      <header className="dashboard-header-premium">
        <div className="header-glass-content">
          <div className="title-section-modern">
            <div className="brand-dot-indicator" />
            <div className="title-group">
              <h1 className="page-title-v2">{t('analytics')}</h1>
              <div className="breadcrumb-premium">
                <span className="station-pill">{selectedStation?.title || t('station_name')}</span>
                <span className="slash">/</span>
                <span className="view-mode">{t('sales_statistics')}</span>
              </div>
            </div>
          </div>
          
          <div className="header-actions-premium">
            <LanguageSwitcher />
            <div className="divider-v" />
            <div className="filter-presets-glass">
              {PRESETS.map((p, i) => (
                <button 
                  key={i} 
                  type="button" 
                  onClick={() => applyPreset(i)} 
                  className={`preset-btn-v2 ${activePreset === i ? 'active' : ''}`}
                >
                  {t(p.key)}
                </button>
              ))}
            </div>
            
            <div className="date-picker-group-v2">
              <div className="input-wrapper">
                <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setActivePreset(-1); }} />
              </div>
              <span className="connector">—</span>
              <div className="input-wrapper">
                <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setActivePreset(-1); }} />
              </div>
            </div>

            <button 
              type="button" 
              onClick={fetchStats} 
              disabled={statsLoading} 
              className="refresh-btn-premium"
            >
              {statsLoading ? (
                <Loader2 size={16} className="spinning" />
              ) : (
                <RefreshCw size={16} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ══════ KPI cards ══════ */}
      {statsLoading && !stats ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
          <div style={{ fontSize: 13 }}>{t('loading_stats')}</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
            <StatMiniCard icon={<TrendingUp size={20} />} label={t('revenue')} value={`${fmt(overview.totalRevenue)} UZS`} color="#2563eb" delay={0} />
            <StatMiniCard
              icon={<DropletIcon size={20} />}
              label={t('volume_label')}
              color="#10b981"
              delay={0.05}
              value={
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Object.entries(overview.totalByUnit || {}).map(([unit, qty]) => (
                    <span key={unit} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 20, fontWeight: 900 }}>{Number(qty).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{unit === 'LITRE' ? 'л' : unit === 'M3' ? 'м³' : unit}</span>
                    </span>
                  ))}
                  {!Object.keys(overview.totalByUnit || {}).length && <span style={{ fontSize: 20, fontWeight: 900 }}>0</span>}
                </span>
              }
            />
            <StatMiniCard icon={<Zap size={20} />} label={t('sessions_label')} value={overview.sessionCount ?? 0} sub={t('all_fuelings')} color="#f59e0b" delay={0.1} />
            <StatMiniCard icon={<BarChart2 size={20} />} label={t('average_check')} value={`${fmt(overview.averageCheck)} UZS`} sub={t('per_session')} color="#8b5cf6" delay={0.15} />
          </div>

          {/* Row: daily chart + fuel donut */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
            <SectionCard title={t('daily_sales_chart')} icon={<TrendingUp size={15} />} delay={0.2}>
              <BarChartSVG data={dailySales} valueKey="amount" labelKey="date" color="#3b82f6" height={160} />
            </SectionCard>
            <SectionCard title={t('by_fuel_type')} icon={<DropletIcon size={15} />} delay={0.25}>
              <DonutChartSVG segments={fuelTypeSegments} totalLabel={`${fmt((overview.totalRevenue || 0) / 1000)}k`} />
            </SectionCard>
          </div>

          {/* Row: peak hours + pump + payment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <SectionCard title={t('peak_hours')} icon={<Clock size={15} />} delay={0.3}>
              <PeakHoursBar data={peakHours} />
            </SectionCard>
            <SectionCard title={t('by_pump')} icon={<BarChart2 size={15} />} delay={0.35}>
              <PumpBreakdown data={byPump} />
            </SectionCard>
            <SectionCard title={t('by_payment_method')} icon={<CreditCard size={15} />} delay={0.4}>
              <DonutChartSVG segments={paymentSegments} totalLabel={Object.values(paymentMethods).reduce((s, v) => s + v.count, 0).toString()} />
            </SectionCard>
          </div>

          {/* Row: fuel table + top customers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            <SectionCard title={t('fuel_consumption_by_type')} icon={<DropletIcon size={15} />} delay={0.45}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px 80px 55px', padding: '0 0 8px', borderBottom: '1px solid #f1f5f9', marginBottom: 6 }}>
                  {[t('table_fuel'), t('table_amount'), t('table_cost'), ' '].map((h, hi) => (
                    <div key={hi} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
                  ))}
                </div>
                {Object.entries(byFuelType).map(([name, v]) => (
                  <div key={name} style={{ display: 'grid', gridTemplateColumns: '1fr 75px 80px 55px', padding: '9px 0', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 9, height: 9, borderRadius: 3, background: fuelColor(name) }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{Number(v.quantity).toFixed(1)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{fmt(v.amount)}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{v.unit === 'M3' ? 'м³' : 'л'}</span>
                  </div>
                ))}
                {!Object.keys(byFuelType).length && <EmptyChart />}
              </div>
            </SectionCard>

            <SectionCard title={t('top_customers')} icon={<Award size={15} />} delay={0.5}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topCustomers.length ? topCustomers.map((c, i) => (
                  <div key={c.phone} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: i === 0 ? '#eff6ff' : '#f8fafc', border: `1px solid ${i === 0 ? '#dbeafe' : '#f1f5f9'}` }}>
                    <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: 9, background: i === 0 ? '#dbeafe' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: i === 0 ? '#2563eb' : '#64748b' }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || t('client')}</div>
                      <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}><Phone size={10} />{c.phone}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{fmt(c.amount)} <span style={{ fontSize: 10, color: '#94a3b8' }}>UZS</span></div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{c.count} {t('trips')}</div>
                    </div>
                  </div>
                )) : <EmptyChart />}
              </div>
            </SectionCard>
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Dashboard;
