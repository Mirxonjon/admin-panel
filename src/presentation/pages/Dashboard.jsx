import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Fuel, 
  Wallet, 
  Power, 
  CheckCircle2, 
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useStation } from '../context/StationContext';
import { apiFetch } from '../../core/api/apiFetch';
import { useToastStore } from '../store/useToastStore';
import { getUserFriendlyErrorMessage } from '../../core/api/userFriendlyError';
import '../styles/layout.css';

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('ru-RU').format(n);
};

const formatUnit = (unit) => {
  const u = String(unit || '').toUpperCase();
  if (u === 'LITRE') return 'L';
  if (u === 'M3') return 'm3';
  if (u === 'KG') return 'kg';
  return unit || 'L';
};

const statusLabel = (status, t) => {
  const s = String(status || '').toUpperCase();
  if (s === 'PENDING') return t('paid_orders');
  if (s === 'ACTIVE') return t('fueling_orders');
  if (s === 'COMPLETED') return 'Завершено';
  if (s === 'CANCELLED') return 'Отменено';
  if (s === 'FAILED') return 'Ошибка';
  return s;
};

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
          <button
            className="confirm-payout-btn premium"
            onClick={() => onConfirm(session?.id)}
            disabled={actioning}
          >
            <CheckCircle2 size={18} />
            {actioning ? (t('loading') || '...') : (t('confirm_payout').toUpperCase())}
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
              <div className="busy-value price">
                {formatMoney(session?.totalAmount)} UZS
              </div>
            </div>
          </div>

          <button
            className="node-action-btn finish-highlight"
            onClick={() => onFinish(session?.id)}
            disabled={actioning}
          >
            <CheckCircle2 size={16} />
            {actioning ? (t('loading') || '...') : t('finish_order').toUpperCase()}
          </button>
        </div>
      );
    }

    return (
      <div className="ready-placeholder">
        <div className="ready-icon-bg">
          <Power size={22} />
        </div>
        <span className="ready-text">{statusLabel(status, t)}</span>
      </div>
    );
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`node-monitor-card ${isActive ? 'busy' : isPending ? 'paid' : 'ready'}`}
    >
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

      <div className="node-content-area">
        {renderContent()}
      </div>
    </motion.div>
  );
};

const Dashboard = () => {
  const { t } = useTranslation();
  const { selectedStation } = useStation();
  const toastError = useToastStore((s) => s.error);
  const selectedStationId = selectedStation?.id ?? null;

  const [sessions, setSessions] = useState([]);
  const [fuelTypeMap, setFuelTypeMap] = useState({});
  const [pumpMap, setPumpMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const loadingRef = useRef(false);

  const loadDashboardData = async ({ silent = false } = {}) => {
    if (!selectedStationId) {
      setSessions([]);
      return;
    }
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!silent) setLoading(true);
    try {
      const [sessionsRes, fuelTypesRes, pumpsRes] = await Promise.all([
        apiFetch('v1/fuel-sessions/admin', {
          method: 'GET',
          params: { page: 1, limit: 100, fuelStationId: selectedStationId },
        }),
        apiFetch('v1/fuel-types', { method: 'GET' }),
        apiFetch('v1/pumps', {
          method: 'GET',
          params: { page: 1, limit: 100, stationId: selectedStationId },
        }),
      ]);

      const items = Array.isArray(sessionsRes?.data?.items) ? sessionsRes.data.items : [];
      setSessions(items);

      const fuels = Array.isArray(fuelTypesRes?.data?.items)
        ? fuelTypesRes.data.items
        : (Array.isArray(fuelTypesRes?.data) ? fuelTypesRes.data : []);
      setFuelTypeMap(
        fuels.reduce((acc, it) => {
          acc[it.id] = it?.name || `Fuel #${it.id}`;
          return acc;
        }, {})
      );

      const pumps = Array.isArray(pumpsRes?.data?.items) ? pumpsRes.data.items : [];
      setPumpMap(
        pumps.reduce((acc, it) => {
          acc[it.id] = it?.fuelPumpNumber ?? it?.id;
          return acc;
        }, {})
      );
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err, t));
    } finally {
      loadingRef.current = false;
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      loadDashboardData({ silent: true });
    }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationId]);

  const pendingSessions = useMemo(
    () => sessions.filter((s) => String(s?.status || '').toUpperCase() === 'PENDING'),
    [sessions]
  );
  const activeSessions = useMemo(
    () => sessions.filter((s) => String(s?.status || '').toUpperCase() === 'ACTIVE'),
    [sessions]
  );
  const completedCount = useMemo(
    () => sessions.filter((s) => String(s?.status || '').toUpperCase() === 'COMPLETED').length,
    [sessions]
  );
  const completedSessions = useMemo(
    () => sessions.filter((s) => String(s?.status || '').toUpperCase() === 'COMPLETED'),
    [sessions]
  );
  const cancelledCount = useMemo(
    () => sessions.filter((s) => String(s?.status || '').toUpperCase() === 'CANCELLED').length,
    [sessions]
  );
  const failedCount = useMemo(
    () => sessions.filter((s) => String(s?.status || '').toUpperCase() === 'FAILED').length,
    [sessions]
  );

  const activeCount = pendingSessions.length + activeSessions.length;
  const readyCount = completedCount;

  const updateStatus = async (id, status) => {
    if (!id) return;
    setActioningId(id);
    try {
      await apiFetch(`v1/fuel-sessions/${id}/status`, {
        method: 'PATCH',
        body: { status },
      });
      await loadDashboardData({ silent: true });
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err, t));
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="title-section">
          <h1 className="page-title">{t('command_center')}</h1>
          <p className="page-subtitle">{t('real_time_logistics')} • {t('node_network', { count: sessions.length })}</p>
        </div>

        <div className="status-badge-group">
          <div className="status-summary-badge active">
            <div className="status-dot active" />
            {activeCount} {t('active')}
          </div>
          <div className="status-summary-badge ready-summary">
            <div className="status-dot ready" />
            {readyCount} {t('ready')}
          </div>
          <div className="status-summary-badge" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
            {cancelledCount + failedCount} Проблемные
          </div>
        </div>
      </header>

      <div className="command-center-grid">
        {loading && sessions.length === 0 ? (
          <div style={{ color: '#64748b', padding: 8 }}>Loading...</div>
        ) : null}
        {[...pendingSessions, ...activeSessions, ...completedSessions].map((session) => (
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
    </div>
  );
};

export default Dashboard;
