import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Flame,
  Clock,
  Fuel,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStation } from '../context/StationContext';
import { apiFetch } from '../../core/api/apiFetch';
import { useToastStore } from '../store/useToastStore';
import { getUserFriendlyErrorMessage } from '../../core/api/userFriendlyError';
import '../styles/layout.css';

const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('ru-RU').format(num);
};

const OrderCard = ({
  id,
  fuelType,
  billing,
  liters,
  unit,
  status,
  actionLabel,
  onAction,
  actionLoading,
}) => {
  const { t } = useTranslation();
  const isBusy = String(status || '').toUpperCase() === 'DISPENSING';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="order-card"
    >
      <div className="order-node">
        <span className="node-label">{t('node')}</span>
        <span className="node-id">{id}</span>
      </div>

      <div className="order-details">
        <div className="order-meta">
          <div className="fuel-tag" style={{ background: '#eff6ff', color: '#2563eb' }}>
            {fuelType}
          </div>
          <div className="order-time">
            <Clock size={14} />
            {t('active')}
          </div>
        </div>
        <div className="order-value">{formatMoney(billing)} UZS</div>
      </div>

      <div className="order-volume">
        <span className="volume-label">{t('volume')}</span>
        <span className="volume-value">{liters} {unit}</span>
      </div>

      <button
        className="order-action-btn"
        onClick={onAction}
        disabled={actionLoading}
      >
        {actionLoading ? <Loader2 size={16} /> : null}
        {actionLabel}
        {!actionLoading ? <ArrowRight size={16} /> : null}
      </button>
    </motion.div>
  );
};

const Transactions = () => {
  const { t } = useTranslation();
  const { selectedStation } = useStation();
  const toastError = useToastStore((s) => s.error);
  const toastSuccess = useToastStore((s) => s.success);
  const selectedStationId = selectedStation?.id ?? null;

  const [sessions, setSessions] = useState([]);
  const [fuelTypeMap, setFuelTypeMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const loadingRef = useRef(false);

  const loadSessions = async (options = {}) => {
    const { silent = false } = options;
    if (!selectedStationId) {
      setSessions([]);
      return;
    }
    if (loadingRef.current) return;

    loadingRef.current = true;
    if (!silent) setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 100,
        fuelStationId: selectedStationId,
      };

      const [confirmedRes, dispensingRes, fuelTypesRes, pumpsRes] = await Promise.all([
        apiFetch('v1/fuel-sessions/admin', {
          method: 'GET',
          params: { ...params, status: 'CONFIRMED' },
        }),
        apiFetch('v1/fuel-sessions/admin', {
          method: 'GET',
          params: { ...params, status: 'DISPENSING' },
        }),
        apiFetch('v1/fuel-types', { method: 'GET' }),
        apiFetch('v1/pumps', {
          method: 'GET',
          params: { stationId: selectedStationId, page: 1, limit: 100 },
        }),
      ]);

      const confirmedItems = Array.isArray(confirmedRes?.data?.items) ? confirmedRes.data.items : [];
      const dispensingItems = Array.isArray(dispensingRes?.data?.items) ? dispensingRes.data.items : [];
      const all = [...confirmedItems, ...dispensingItems];

      const fuelTypes = Array.isArray(fuelTypesRes?.data?.items)
        ? fuelTypesRes.data.items
        : (Array.isArray(fuelTypesRes?.data) ? fuelTypesRes.data : []);
      const fuelMap = fuelTypes.reduce((acc, f) => {
        acc[f.id] = f?.name || `Fuel #${f.id}`;
        return acc;
      }, {});
      setFuelTypeMap(fuelMap);

      const pumps = Array.isArray(pumpsRes?.data?.items) ? pumpsRes.data.items : [];
      const pumpMap = pumps.reduce((acc, p) => {
        acc[p.id] = p?.fuelPumpNumber ?? p?.id;
        return acc;
      }, {});

      const normalized = all.map((it) => ({
        ...it,
        nodeId: String(pumpMap[it?.fuelPumpId] ?? it?.fuelPumpId ?? '').padStart(2, '0'),
        fuelTypeName: fuelMap[it?.fuelTypeId] || `Fuel #${it?.fuelTypeId ?? '—'}`,
      }));
      setSessions(normalized);
      setHasLoadedOnce(true);
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err, t));
      setSessions([]);
    } finally {
      loadingRef.current = false;
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    const intervalId = setInterval(() => {
      // Tab faol bo'lganda poll qilamiz (ortiqcha yuk bo'lmasligi uchun)
      if (document.visibilityState !== 'visible') return;
      loadSessions({ silent: true });
    }, 10000);

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationId]);

  const confirmedOrders = useMemo(
    () => sessions.filter((s) => String(s?.status || '').toUpperCase() === 'CONFIRMED'),
    [sessions]
  );
  const dispensingOrders = useMemo(
    () => sessions.filter((s) => String(s?.status || '').toUpperCase() === 'DISPENSING'),
    [sessions]
  );

  const updateSessionStatus = async (sessionId, status) => {
    if (!sessionId) return;
    setActioningId(sessionId);
    try {
      await apiFetch(`v1/fuel-sessions/${sessionId}/status`, {
        method: 'PATCH',
        body: { status },
      });
      toastSuccess(t('update_success'));
      await loadSessions();
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
          <h1 className="page-title">{t('order_queue')}</h1>
          <p className="page-subtitle">{t('order_queue_subtitle')}</p>
        </div>

        <div className="queue-stat-card">
          <div className="stat-info">
            <span className="stat-label">{t('queue_size')}</span>
            <span className="stat-value">{confirmedOrders.length + dispensingOrders.length} {t('orders_count')}</span>
          </div>
          <div className="stat-icon-wrapper">
            <Fuel size={24} color="#2563eb" />
          </div>
        </div>
      </header>

      <div className="order-columns">
        {/* Paid Orders Column */}
        <div className="order-column">
          <div className="column-header">
            <div className="column-title">
              <CheckCircle2 size={18} color="#10b981" />
              <h2>{t('paid_orders')}</h2>
            </div>
            <span className="count-badge">{confirmedOrders.length}</span>
          </div>

          <div className="order-list">
            {loading && !hasLoadedOnce ? <div style={{ padding: 8, color: '#64748b' }}>{t('loading') || 'Loading...'}</div> : null}
            <AnimatePresence>
              {confirmedOrders.map((node) => (
                <OrderCard
                  key={node.id}
                  id={node.nodeId}
                  fuelType={node.fuelTypeName}
                  billing={node.totalAmount}
                  liters={node.quantity}
                  unit={String(node?.unit || '').toUpperCase() === 'M3' ? 'm³' : 'L'}
                  status={node.status}
                  actionLabel={t('confirm_payout')}
                  onAction={() => updateSessionStatus(node.id, 'DISPENSING')}
                  actionLoading={actioningId === node.id}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Fueling Column */}
        <div className="order-column">
          <div className="column-header">
            <div className="column-title">
              <Flame size={18} color="#3b82f6" />
              <h2>{t('fueling_orders')}</h2>
            </div>
            <span className="count-badge active">{dispensingOrders.length}</span>
          </div>

          <div className="order-list">
            {loading && !hasLoadedOnce ? <div style={{ padding: 8, color: '#64748b' }}>{t('loading') || 'Loading...'}</div> : null}
            <AnimatePresence>
              {dispensingOrders.map((node) => (
                <OrderCard
                  key={node.id}
                  id={node.nodeId}
                  fuelType={node.fuelTypeName}
                  billing={node.totalAmount}
                  liters={node.quantity}
                  unit={String(node?.unit || '').toUpperCase() === 'M3' ? 'm³' : 'L'}
                  status={node.status}
                  actionLabel={t('finish_order')}
                  onAction={() => updateSessionStatus(node.id, 'COMPLETED')}
                  actionLoading={actioningId === node.id}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
