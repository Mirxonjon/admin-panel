import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  DropletIcon,
  Users,
  Zap,
  BarChart2,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  ChevronDown,
  Award,
  Phone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../../core/api/apiFetch';
import { useStation } from '../context/StationContext';
import { useToastStore } from '../store/useToastStore';
import '../styles/layout.css';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (v) => new Intl.NumberFormat('ru-RU').format(Math.round(Number(v) || 0));
const fmtDecimal = (v, d = 1) => Number(Number(v) || 0).toFixed(d);

const FUEL_COLORS = {
  'AI-80': '#f59e0b',
  'AI-92': '#3b82f6',
  'AI-95': '#10b981',
  'Methane': '#8b5cf6',
  'Propane': '#ef4444',
};
const fuelColor = (name) => FUEL_COLORS[name] || '#64748b';

const PAYMENT_COLORS = {
  CLICK: '#3b82f6',
  PAYME: '#10b981',
  CARD: '#8b5cf6',
  OTHER: '#64748b',
};
const paymentColor = (key) => PAYMENT_COLORS[key] || '#64748b';

// ─── StatCard ─────────────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, sub, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: 'spring', stiffness: 400, damping: 30 }}
    style={{
      background: '#fff',
      borderRadius: 20,
      border: '1px solid #f1f5f9',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      padding: '20px 24px',
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        minWidth: 48,
        borderRadius: 14,
        background: `${color}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
      }}
    >
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', lineHeight: 1.2, marginTop: 4 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{sub}</div>}
    </div>
  </motion.div>
);

// ─── Auto-aggregate helper ────────────────────────────────────────────────────

const aggregateData = (raw, valueKey) => {
  if (!raw.length) return { items: [], mode: 'daily' };

  if (raw.length <= 14) return { items: raw, mode: 'daily' };

  if (raw.length <= 60) {
    // Group by ISO week (Mon-Sun)
    const map = new Map();
    raw.forEach((d) => {
      const date = new Date(d.date);
      // Get Monday of that week
      const day = date.getDay(); // 0=Sun
      const diff = day === 0 ? -6 : 1 - day;
      const mon = new Date(date);
      mon.setDate(date.getDate() + diff);
      const key = mon.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, { date: key, [valueKey]: 0, quantity: 0 });
      const entry = map.get(key);
      entry[valueKey] += Number(d[valueKey]) || 0;
      entry.quantity += Number(d.quantity) || 0;
    });
    return { items: Array.from(map.values()), mode: 'weekly' };
  }

  // Group by month
  const map = new Map();
  raw.forEach((d) => {
    const key = d.date.slice(0, 7); // "2026-03"
    if (!map.has(key)) map.set(key, { date: key, [valueKey]: 0, quantity: 0 });
    const entry = map.get(key);
    entry[valueKey] += Number(d[valueKey]) || 0;
    entry.quantity += Number(d.quantity) || 0;
  });
  return { items: Array.from(map.values()), mode: 'monthly' };
};

const MODE_LABEL = { daily: 'По дням', weekly: 'По неделям', monthly: 'По месяцам' };

// ─── BarChart (SVG) ───────────────────────────────────────────────────────────

const BarChartSVG = ({ data, valueKey = 'amount', labelKey = 'date', color = '#3b82f6', height = 180 }) => {
  const raw = data || [];
  const { items, mode } = aggregateData(raw, valueKey);
  if (!items.length) return <EmptyChart />;

  const maxVal = Math.max(...items.map((d) => Number(d[valueKey]) || 0), 1);

  // Y-axis: 4 nice ticks
  const rawStep = maxVal / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const niceStep = Math.ceil((rawStep || 1) / magnitude) * magnitude;
  const ticks = Array.from({ length: 5 }, (_, i) => i * niceStep).filter((t) => t <= maxVal * 1.15);

  const PAD_LEFT = 58;
  const PAD_RIGHT = 8;
  const PAD_TOP = 8;
  const PAD_BOTTOM = 28;
  const chartH = height;

  const barGap = mode === 'monthly' ? 10 : 6;
  const barW = Math.max(12, Math.floor((520 - items.length * barGap) / items.length));
  const chartW = items.length * (barW + barGap) - barGap;
  const totalW = chartW + PAD_LEFT + PAD_RIGHT;
  const totalH = chartH + PAD_TOP + PAD_BOTTOM;

  const yPos = (val) => PAD_TOP + chartH - (val / (ticks[ticks.length - 1] || maxVal)) * chartH;

  const fmtTick = (v) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
    return String(v);
  };

  // X-label: daily=last 5 chars "03-27", weekly="w03-27", monthly="Mar 26"
  const xLabel = (dateStr) => {
    if (mode === 'monthly') {
      const [y, m] = dateStr.split('-');
      const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
      return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
    }
    if (mode === 'weekly') return `↑${dateStr.slice(5)}`; // "↑03-24" = week starting
    return dateStr.slice(5); // "03-27"
  };

  return (
    <div>
      {/* Mode badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#2563eb',
          background: '#eff6ff', border: '1px solid #dbeafe',
          borderRadius: 6, padding: '2px 8px',
        }}>
          {MODE_LABEL[mode]}
        </span>
      </div>

      <svg viewBox={`0 0 ${totalW} ${totalH}`} style={{ width: '100%', height: totalH, overflow: 'visible' }}>
        <defs>
          <linearGradient id="barGradMain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Grid lines + Y labels */}
        {ticks.map((tick, i) => {
          const y = yPos(tick);
          return (
            <g key={i}>
              <line
                x1={PAD_LEFT} y1={y}
                x2={PAD_LEFT + chartW} y2={y}
                stroke={tick === 0 ? '#cbd5e1' : '#f1f5f9'}
                strokeWidth={tick === 0 ? 1.5 : 1}
                strokeDasharray={tick === 0 ? '' : '4 3'}
              />
              <text
                x={PAD_LEFT - 8} y={y + 4}
                textAnchor="end" fontSize={10} fill="#94a3b8" fontWeight={600}
              >
                {fmtTick(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {items.map((item, i) => {
          const val = Number(item[valueKey]) || 0;
          const topTick = ticks[ticks.length - 1] || maxVal;
          const barH = Math.max(4, (val / topTick) * chartH);
          const x = PAD_LEFT + i * (barW + barGap);
          const y = PAD_TOP + chartH - barH;
          const label = xLabel(String(item[labelKey] || item.date || ''));
          const tooltipText = mode === 'weekly'
            ? `Неделя с ${item.date}: ${fmtTick(val)} UZS`
            : mode === 'monthly'
              ? `${label}: ${fmtTick(val)} UZS`
              : `${item.date}: ${fmtTick(val)} UZS`;

          return (
            <g key={i}>
              {/* Shadow */}
              <rect x={x + 1} y={y + 3} width={barW} height={barH} rx={5} fill={color} opacity={0.07} />
              {/* Bar */}
              <rect
                x={x} y={y} width={barW} height={barH} rx={5}
                fill="url(#barGradMain)" opacity={0.92}
                style={{ transition: 'all 0.4s ease', cursor: 'pointer' }}
              />
              <title>{tooltipText}</title>
              {/* Value on top */}
              {barH > 26 && (
                <text
                  x={x + barW / 2} y={y - 5}
                  textAnchor="middle" fontSize={9} fill={color} fontWeight={800} opacity={0.8}
                >
                  {fmtTick(val)}
                </text>
              )}
              {/* X label */}
              <text
                x={x + barW / 2}
                y={PAD_TOP + chartH + PAD_BOTTOM - 6}
                textAnchor="middle"
                fontSize={mode === 'monthly' ? 10 : 9.5}
                fill="#94a3b8"
                fontWeight={600}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Y-axis line */}
        <line
          x1={PAD_LEFT} y1={PAD_TOP}
          x2={PAD_LEFT} y2={PAD_TOP + chartH}
          stroke="#e2e8f0" strokeWidth={1.5}
        />
      </svg>
    </div>
  );
};


// ─── DonutChart (SVG) ─────────────────────────────────────────────────────────

const DonutChartSVG = ({ segments, totalLabel }) => {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (!total) return <EmptyChart />;
  let angle = -90;
  const R = 56, r = 34, cx = 70, cy = 70;

  const arcs = segments.map((seg) => {
    const pct = seg.value / total;
    const deg = pct * 360;
    const rad1 = (angle * Math.PI) / 180;
    const rad2 = ((angle + deg) * Math.PI) / 180;
    const x1 = cx + R * Math.cos(rad1);
    const y1 = cy + R * Math.sin(rad1);
    const x2 = cx + R * Math.cos(rad2);
    const y2 = cy + R * Math.sin(rad2);
    const x3 = cx + r * Math.cos(rad2);
    const y3 = cy + r * Math.sin(rad2);
    const x4 = cx + r * Math.cos(rad1);
    const y4 = cy + r * Math.sin(rad1);
    const largeArc = deg > 180 ? 1 : 0;
    const d = `M${x1},${y1} A${R},${R},0,${largeArc},1,${x2},${y2} L${x3},${y3} A${r},${r},0,${largeArc},0,${x4},${y4} Z`;
    angle += deg;
    return { ...seg, d, pct };
  });

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 140 140" style={{ width: 120, height: 120, flexShrink: 0 }}>
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} opacity={0.9}>
            <title>{`${a.label}: ${Math.round(a.pct * 100)}%`}</title>
          </path>
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={800} fill="#0f172a">
          {totalLabel}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {arcs.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: a.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{a.label}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{Math.round(a.pct * 100)}% • {fmt(a.value)} UZS</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── PeakHoursBar ─────────────────────────────────────────────────────────────

const PeakHoursBar = ({ data }) => {
  const hours = Array.isArray(data) ? data : [];
  if (!hours.length) return <EmptyChart />;
  const maxCount = Math.max(...hours.map((h) => h.count), 1);
  const all24 = Array.from({ length: 24 }, (_, i) => {
    const found = hours.find((h) => h.hour === i);
    return { hour: i, count: found?.count || 0 };
  });
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 64 }}>
      {all24.map((h) => {
        const heightPct = (h.count / maxCount) * 100;
        const isActive = h.count > 0;
        return (
          <div
            key={h.hour}
            title={`${String(h.hour).padStart(2, '0')}:00 — ${h.count} сессий`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: '100%',
              gap: 2,
            }}
          >
            <div
              style={{
                width: '100%',
                height: `${Math.max(heightPct, isActive ? 8 : 2)}%`,
                minHeight: isActive ? 8 : 2,
                background: isActive ? '#3b82f6' : '#e2e8f0',
                borderRadius: 3,
                transition: 'all 0.4s',
              }}
            />
          </div>
        );
      })}
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
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {fmt(val.amount)} UZS • {val.count} сессий
              </span>
            </div>
            <div style={{ height: 8, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: colors[i % colors.length],
                  borderRadius: 8,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── EmptyChart ───────────────────────────────────────────────────────────────

const EmptyChart = () => (
  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
    Нет данных
  </div>
);

// ─── SectionCard ──────────────────────────────────────────────────────────────

const SectionCard = ({ title, icon, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: 'spring', stiffness: 350, damping: 28 }}
    style={{
      background: '#fff',
      borderRadius: 20,
      border: '1px solid #f1f5f9',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      padding: '20px 22px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2563eb',
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{title}</div>
    </div>
    {children}
  </motion.div>
);

// ─── DateRangePicker ─────────────────────────────────────────────────────────

const PRESETS = [
  { label: '7 дней', days: 7 },
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
  { label: 'Всё время', days: 365 * 3 },
];

const toDateStr = (d) => d.toISOString().slice(0, 10);

// ─── Main Statistics Page ─────────────────────────────────────────────────────

const Statistics = () => {
  const { selectedStation } = useStation();
  const toastError = useToastStore((s) => s.error);
  const stationId = selectedStation?.id ?? null;

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState(2); // 90 дней default

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return toDateStr(d);
  });
  const [to, setTo] = useState(() => toDateStr(new Date()));

  const applyPreset = (idx) => {
    setActivePreset(idx);
    const d = new Date();
    const from = new Date(d.getTime() - PRESETS[idx].days * 24 * 60 * 60 * 1000);
    setFrom(toDateStr(from));
    setTo(toDateStr(d));
  };

  const fetchStats = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await apiFetch('v1/fuel-sessions/cashier/stats', {
        method: 'GET',
        params: { from, to, fuelStationId: stationId },
      });
      setStats(res?.data ?? null);
    } catch (err) {
      toastError(err?.message || 'Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  }, [stationId, from, to, toastError]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Derived data
  const overview = stats?.overview ?? {};
  const byFuelType = stats?.byFuelType ?? {};
  const byPump = stats?.byPump ?? {};
  const dailySales = stats?.dailySales ?? [];
  const peakHours = stats?.peakHours ?? [];
  const topCustomers = stats?.topCustomers ?? [];
  const paymentMethods = stats?.paymentMethods ?? {};

  const fuelTypeSegments = useMemo(
    () =>
      Object.entries(byFuelType).map(([name, v]) => ({
        label: name,
        value: v.amount,
        color: fuelColor(name),
      })),
    [byFuelType]
  );

  const paymentSegments = useMemo(
    () =>
      Object.entries(paymentMethods).map(([key, v]) => ({
        label: key,
        value: v.amount,
        color: paymentColor(key),
      })),
    [paymentMethods]
  );

  return (
    <div className="dashboard-container" style={{ maxWidth: 1300 }}>
      {/* ── Header ── */}
      <header className="dashboard-header" style={{ marginBottom: 28 }}>
        <div className="title-section">
          <h1 className="page-title" style={{ fontSize: 28 }}>Статистика</h1>
          <p className="page-subtitle">
            {selectedStation?.title || 'Станция не выбрана'} • Аналитика продаж
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Preset buttons */}
          <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 12, padding: 4, border: '1px solid #e2e8f0' }}>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyPreset(i)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  background: activePreset === i ? '#2563eb' : 'transparent',
                  color: activePreset === i ? '#fff' : '#64748b',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date inputs */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setActivePreset(-1); }}
              style={{ height: 38, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 10px', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none', background: '#fff' }}
            />
            <span style={{ color: '#94a3b8', fontWeight: 700 }}>—</span>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setActivePreset(-1); }}
              style={{ height: 38, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 10px', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none', background: '#fff' }}
            />
          </div>

          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            style={{
              height: 38,
              padding: '0 16px',
              borderRadius: 10,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
            {loading ? 'Загрузка…' : 'Обновить'}
          </button>
        </div>
      </header>

      {!stationId ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8', fontSize: 16, fontWeight: 600 }}>
          Выберите станцию для просмотра статистики
        </div>
      ) : loading && !stats ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Загрузка данных…</div>
        </div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
            <StatCard
              icon={<TrendingUp size={22} />}
              label="Выручка"
              value={`${fmt(overview.totalRevenue)} UZS`}
              color="#2563eb"
              delay={0}
            />
            <StatCard
              icon={<DropletIcon size={22} />}
              label="Объём"
              value={(
                <span style={{ fontSize: 20, lineHeight: 1.3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Object.entries(overview.totalByUnit || {}).map(([unit, qty]) => (
                    <span key={unit} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>
                        {Number(qty).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
                        {unit === 'LITRE' ? 'л' : unit === 'M3' ? 'м³' : unit === 'KG' ? 'кг' : unit}
                      </span>
                    </span>
                  ))}
                  {!Object.keys(overview.totalByUnit || {}).length && (
                    <span style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>0</span>
                  )}
                </span>
              )}
              sub="Топлива отпущено"
              color="#10b981"
              delay={0.05}
            />
            <StatCard
              icon={<Zap size={22} />}
              label="Сессии"
              value={overview.sessionCount ?? 0}
              sub="Всего заправок"
              color="#f59e0b"
              delay={0.1}
            />
            <StatCard
              icon={<BarChart2 size={22} />}
              label="Средний чек"
              value={`${fmt(overview.averageCheck)} UZS`}
              sub="На сессию"
              color="#8b5cf6"
              delay={0.15}
            />
          </div>

          {/* ── Row 2: Daily Sales + Fuel Type Donut ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
            <SectionCard title="Ежедневные продажи (UZS)" icon={<TrendingUp size={16} />} delay={0.2}>
              <BarChartSVG data={dailySales} valueKey="amount" labelKey="date" color="#3b82f6" height={160} />
            </SectionCard>

            <SectionCard title="По типу топлива" icon={<DropletIcon size={16} />} delay={0.25}>
              <DonutChartSVG
                segments={fuelTypeSegments}
                totalLabel={`${fmt(overview.totalRevenue / 1000)}k`}
              />
            </SectionCard>
          </div>

          {/* ── Row 3: Peak Hours + Pump Breakdown + Payment ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <SectionCard title="Пиковые часы" icon={<Clock size={16} />} delay={0.3}>
              <PeakHoursBar data={peakHours} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>00:00</span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>12:00</span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>23:00</span>
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {peakHours.slice().sort((a, b) => b.count - a.count).slice(0, 3).map((h, i) => (
                  <div key={h.hour} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                      {String(h.hour).padStart(2, '0')}:00
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                      {h.count} сессий
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="По ТРК" icon={<BarChart2 size={16} />} delay={0.35}>
              <PumpBreakdown data={byPump} />
            </SectionCard>

            <SectionCard title="По способу оплаты" icon={<CreditCard size={16} />} delay={0.4}>
              <DonutChartSVG
                segments={paymentSegments}
                totalLabel={Object.values(paymentMethods).reduce((s, v) => s + v.count, 0).toString()}
              />
            </SectionCard>
          </div>

          {/* ── Row 4: Fuel type table + Top Customers ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <SectionCard title="Расход по типу топлива" icon={<DropletIcon size={16} />} delay={0.45}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px', padding: '0 0 8px', borderBottom: '1px solid #f1f5f9', marginBottom: 8 }}>
                  {['Вид', 'Кол-во', 'Сумма', 'Ед.'].map((h) => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
                  ))}
                </div>
                {Object.entries(byFuelType).map(([name, v]) => (
                  <div key={name} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px', padding: '10px 0', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: fuelColor(name) }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{fmtDecimal(v.quantity)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fmt(v.amount)}</span>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{v.unit === 'M3' ? 'м³' : v.unit === 'LITRE' ? 'л' : v.unit}</span>
                  </div>
                ))}
                {!Object.keys(byFuelType).length && <EmptyChart />}
              </div>
            </SectionCard>

            <SectionCard title="Топ клиенты" icon={<Award size={16} />} delay={0.5}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topCustomers.length ? topCustomers.map((c, i) => (
                  <div
                    key={c.phone}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 14,
                      background: i === 0 ? '#eff6ff' : '#f8fafc',
                      border: `1px solid ${i === 0 ? '#dbeafe' : '#f1f5f9'}`,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        borderRadius: 10,
                        background: i === 0 ? '#dbeafe' : '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 900,
                        color: i === 0 ? '#2563eb' : '#64748b',
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name || 'Клиент'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Phone size={11} />
                        {c.phone}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>{fmt(c.amount)} <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>UZS</span></div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{c.count} поездок</div>
                    </div>
                  </div>
                )) : <EmptyChart />}
              </div>
            </SectionCard>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Statistics;
