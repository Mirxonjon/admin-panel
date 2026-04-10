import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag,
  DollarSign,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { apiFetch } from '../../core/api/apiFetch';
import { useStation } from '../context/StationContext';
import { useToastStore } from '../store/useToastStore';
import { getUserFriendlyErrorMessage } from '../../core/api/userFriendlyError';
import '../styles/layout.css';

const StatCard = ({ title, value, icon, delay, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="history-stat-card"
  >
    <div className="history-stat-content">
      <div className="history-stat-header">
        <span className="history-stat-label">{title}</span>
        <div className="history-stat-icon" style={{ background: color + '15', color: color }}>
          {icon}
        </div>
      </div>
      <div className="history-stat-value">{value}</div>
    </div>
  </motion.div>
);

const UNIT_MAP = {
  LITRE: 'L',
  KG: 'kg',
  M3: 'm3',
  KWH: 'kWh',
};

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'DISPENSING', 'COMPLETED', 'CANCELLED'];

const STATUS_RU = {
  PENDING: 'Ожидание',
  CONFIRMED: 'Подтверждено',
  DISPENSING: 'Заправка',
  COMPLETED: 'Завершено',
  CANCELLED: 'Отменено',
};

const formatUnit = (unit) => UNIT_MAP[String(unit || '').toUpperCase()] || (unit || '');
const formatAmount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(2);
};
const formatCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('ru-RU').format(num);
};
const formatTime = (dateIso) => {
  if (!dateIso) return '—';
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const TransactionItem = ({ row, delay }) => {
  const getPaymentIcon = (type) => {
    const normalized = String(type || '').toLowerCase();
    switch (normalized) {
      case 'visa': return <CreditCard size={14} />;
      case 'cash': return <Banknote size={14} />;
      case 'apple pay': return <Smartphone size={14} />;
      default: return <CreditCard size={14} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="transaction-item"
    >
      <div className="tx-col tx-time">{formatTime(row?.createdAt)}</div>
      <div className="tx-col tx-pump">
        ТРК #{String(row?.pumpNumber ?? row?.fuelPumpId ?? '—').padStart(2, '0')}
      </div>
      <div className="tx-col tx-fuel">
        <div className="fuel-indicator" style={{ background: '#10b981' }}></div>
        <span>{row?.fuelTypeName || `Fuel #${row?.fuelTypeId ?? '—'}`}</span>
      </div>
      <div className="tx-col tx-amount">
        {formatAmount(row?.quantity)} {formatUnit(row?.unit)}
      </div>
      <div className="tx-col tx-cost">{formatCurrency(row?.totalAmount)} UZS</div>
      <div className="tx-col tx-payment">
        <div className={`payment-tag ${String(row?.paymentMethod || 'cash').toLowerCase().replace(' ', '-')}`}>
          {getPaymentIcon(row?.paymentMethod || 'cash')}
          <span>{row?.paymentMethod || 'CASH'}</span>
        </div>
      </div>
      <div className="tx-col tx-action"></div>
    </motion.div>
  );
};

const History = () => {
  const { t } = useTranslation();
  const { selectedStation } = useStation();
  const toastError = useToastStore((s) => s.error);
  const selectedStationId = selectedStation?.id ?? null;

  const [transactions, setTransactions] = useState([]);
  const [pumps, setPumps] = useState([]);
  const [fuelTypeMap, setFuelTypeMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedPumpId, setSelectedPumpId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [serverPage, setServerPage] = useState(1);
  const [serverLimit, setServerLimit] = useState(10);
  const [summaryCount, setSummaryCount] = useState(0);
  const [summaryAmount, setSummaryAmount] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!selectedStationId) {
      setPumps([]);
      setSelectedPumpId('');
      return;
    }

    let cancelled = false;
    const loadPumps = async () => {
      try {
        const res = await apiFetch('v1/pumps', {
          method: 'GET',
          params: { stationId: selectedStationId, page: 1, limit: 100 },
        });
        if (cancelled) return;
        const items = res?.data?.items;
        setPumps(Array.isArray(items) ? items : []);
      } catch (err) {
        if (cancelled) return;
        toastError(getUserFriendlyErrorMessage(err, t));
        setPumps([]);
      }
    };

    loadPumps();
    return () => {
      cancelled = true;
    };
  }, [selectedStationId, toastError, t]);

  useEffect(() => {
    if (!selectedStationId) {
      setTransactions([]);
      setTotal(0);
      setSummaryAmount(0);
      setSummaryCount(0);
      return;
    }

    let cancelled = false;
    const loadHistory = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          limit,
          fuelStationId: selectedStationId,
        };
        if (selectedPumpId) params.fuelPumpId = selectedPumpId;
        if (selectedStatus) params.status = selectedStatus;
        if (fromDate) params.from = fromDate;
        if (toDate) params.to = toDate;

        const [historyRes, fuelTypesRes] = await Promise.all([
          apiFetch('v1/fuel-sessions/admin', { method: 'GET', params }),
          apiFetch('v1/fuel-types', { method: 'GET' }),
        ]);
        if (cancelled) return;

        const items = Array.isArray(historyRes?.data?.items) ? historyRes.data.items : [];
        const list = Array.isArray(fuelTypesRes?.data?.items)
          ? fuelTypesRes.data.items
          : (Array.isArray(fuelTypesRes?.data) ? fuelTypesRes.data : []);
        const map = list.reduce((acc, it) => {
          acc[it.id] = it?.name || `Fuel #${it.id}`;
          return acc;
        }, {});
        setFuelTypeMap(map);
        const normalized = items.map((it) => {
          const linkedPump = pumps.find((p) => p.id === it?.fuelPumpId);
          return {
            ...it,
            pumpNumber: linkedPump?.fuelPumpNumber ?? it?.fuelPumpId,
            fuelTypeName: map[it?.fuelTypeId] || `Fuel #${it?.fuelTypeId ?? '—'}`,
            paymentMethod: it?.paymentId ? 'CARD' : 'CASH',
          };
        });

        setTransactions(normalized);
        setTotal(Number(historyRes?.data?.total || 0));
        setServerPage(Number(historyRes?.data?.page || page));
        setServerLimit(Number(historyRes?.data?.limit || limit));
        setSummaryCount(Number(historyRes?.data?.total || normalized.length));
        setSummaryAmount(
          normalized.reduce((acc, it) => acc + (Number(it?.totalAmount) || 0), 0)
        );
      } catch (err) {
        if (cancelled) return;
        toastError(getUserFriendlyErrorMessage(err, t));
        setTransactions([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [selectedStationId, selectedPumpId, selectedStatus, fromDate, toDate, page, limit, pumps, toastError, t]);

  const effectiveLimit = serverLimit > 0 ? serverLimit : limit;
  const maxPage = useMemo(() => {
    if (!Number.isFinite(total) || total <= 0) return 1;
    return Math.max(1, Math.ceil(total / effectiveLimit));
  }, [total, effectiveLimit]);

  const summaryValue = useMemo(
    () => `${formatCurrency(summaryAmount)} UZS`,
    [summaryAmount]
  );

  const showingStart = total === 0 ? 0 : (serverPage - 1) * effectiveLimit + 1;
  const showingEnd = Math.min(serverPage * effectiveLimit, total);

  const handleExportExcel = async () => {
    if (!selectedStationId) return;
    setExporting(true);
    try {
      const exportLimit = 200;
      let exportPage = 1;
      let exportTotal = 0;
      const allItems = [];

      while (exportPage === 1 || allItems.length < exportTotal) {
        const params = {
          page: exportPage,
          limit: exportLimit,
          fuelStationId: selectedStationId,
        };
        if (selectedPumpId) params.fuelPumpId = selectedPumpId;
        if (selectedStatus) params.status = selectedStatus;
        if (fromDate) params.from = fromDate;
        if (toDate) params.to = toDate;

        const res = await apiFetch('v1/fuel-sessions/admin', { method: 'GET', params });
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        exportTotal = Number(res?.data?.total || 0);
        allItems.push(...items);

        if (!items.length) break;
        exportPage += 1;
      }

      if (!allItems.length) return;

      const rows = allItems.map((it) => {
        const pump = pumps.find((p) => p.id === it?.fuelPumpId);
        return {
          ID: it?.id ?? '',
          CreatedAt: it?.createdAt ?? '',
          StationId: it?.fuelStationId ?? selectedStationId,
          Pump: `#${String(pump?.fuelPumpNumber ?? it?.fuelPumpId ?? '—').padStart(2, '0')}`,
          FuelType: fuelTypeMap[it?.fuelTypeId] || `Fuel #${it?.fuelTypeId ?? '—'}`,
          Quantity: formatAmount(it?.quantity),
          Unit: formatUnit(it?.unit),
          PricePerUnit: Number(it?.pricePerUnit || 0),
          TotalAmount: Number(it?.totalAmount || 0),
          Status: it?.status ?? '',
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 8 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 18 },
        { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'FuelSessions');

      const fromPart = fromDate || 'all';
      const toPart = toDate || 'all';
      XLSX.writeFile(wb, `fuel-sessions_${fromPart}_${toPart}.xlsx`);
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err, t));
    } finally {
      setExporting(false);
    }
  };

  const onChangeFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="dashboard-container">
      <div className="history-stats-grid">
        <StatCard
          title={t('total_orders')}
          value={String(summaryCount)}
          icon={<ShoppingBag size={24} />}
          delay={0.1}
          color="#2563eb"
        />
        <StatCard
          title={t('total_sum')}
          value={summaryValue}
          icon={<DollarSign size={24} />}
          delay={0.2}
          color="#10b981"
        />
      </div>

      <div className="transaction-list-container">
        <div className="table-header-filters">
          <div className="table-title-group">
            <h2 className="table-main-title">{t('transaction_ledger')}</h2>
          </div>
          <div className="table-actions-group">
            <div className="date-picker-trigger">
              <select
                value={selectedPumpId}
                onChange={(e) => onChangeFilter(setSelectedPumpId, e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 700, color: '#334155' }}
              >
                <option value="">{t('all_pumps')}</option>
                {pumps.map((pump) => (
                  <option key={pump.id} value={pump.id}>
                    {`ТРК #${String(pump?.fuelPumpNumber ?? pump.id).padStart(2, '0')}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="date-picker-trigger" style={{ gap: 8 }}>
              <Calendar size={16} />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => onChangeFilter(setFromDate, e.target.value)}
                style={{ border: 'none', background: 'transparent', color: '#334155', fontWeight: 600 }}
                title="From"
              />
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => onChangeFilter(setToDate, e.target.value)}
                style={{ border: 'none', background: 'transparent', color: '#334155', fontWeight: 600 }}
                title="To"
              />
            </div>
            <div className="date-picker-trigger">
              <select
                value={selectedStatus}
                onChange={(e) => onChangeFilter(setSelectedStatus, e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 700, color: '#334155' }}
              >
                <option value="">Все статусы</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_RU[s] || s}
                  </option>
                ))}
              </select>
            </div>
            <button className="export-csv-btn" onClick={handleExportExcel} type="button" disabled={exporting || !selectedStationId}>
              <Download size={16} />
              <span>{exporting ? (t('loading') || 'Loading...') : (t('export_csv') || 'Скачать')}</span>
            </button>
          </div>
        </div>

        <div className="list-header">
          <div className="tx-col">{t('table_time')}</div>
          <div className="tx-col">{t('table_pump')}</div>
          <div className="tx-col">{t('table_fuel')}</div>
          <div className="tx-col">{t('table_amount')}</div>
          <div className="tx-col">{t('table_cost')}</div>
          <div className="tx-col">{t('status')}</div>
          <div className="tx-col"></div>
        </div>
        <div className="transaction-list">
          {loading ? (
            <div style={{ padding: '16px 24px', color: '#64748b' }}>{t('loading') || 'Loading...'}</div>
          ) : null}
          {!loading && transactions.map((tx, idx) => (
            <TransactionItem key={tx.id || idx} row={tx} delay={0.05 + idx * 0.03} />
          ))}
          {!loading && transactions.length === 0 ? (
            <div style={{ padding: '16px 24px', color: '#64748b' }}>Транзакции не найдены</div>
          ) : null}
        </div>

        <div className="table-pagination-footer">
          <div className="pagination-info">
            {t('showing_transactions', { start: showingStart, end: showingEnd, total })}
          </div>
          <div className="pagination-controls">
            <button
              className={`page-control-btn ${page <= 1 ? 'disabled' : ''}`}
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className={`page-control-btn ${page >= maxPage ? 'disabled' : 'active'}`}
              type="button"
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              disabled={page >= maxPage}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
