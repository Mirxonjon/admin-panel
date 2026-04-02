import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Calendar,
  Eye,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronDown,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
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

const TransactionItem = ({ time, pump, fuel, amount, cost, payment, delay }) => {
  const getPaymentIcon = (type) => {
    switch (type.toLowerCase()) {
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
      <div className="tx-col tx-time">{time}</div>
      <div className="tx-col tx-pump">Pump #{pump}</div>
      <div className="tx-col tx-fuel">
        <div className="fuel-indicator" style={{ background: fuel.color }}></div>
        <span>{fuel.type}</span>
      </div>
      <div className="tx-col tx-amount">{amount} L</div>
      <div className="tx-col tx-cost">${cost}</div>
      <div className="tx-col tx-payment">
        <div className={`payment-tag ${payment.toLowerCase().replace(' ', '-')}`}>
          {getPaymentIcon(payment)}
          <span>{payment}</span>
        </div>
      </div>
      <div className="tx-col tx-action">
        <button className="view-btn">
          <Eye size={18} />
        </button>
      </div>
    </motion.div>
  );
};

const History = () => {
  const { t } = useTranslation();

  const transactions = [
    { time: '10:42 AM', pump: '04', fuel: { type: '95 Octane', color: '#10b981' }, amount: '45.20', cost: '72.32', payment: 'VISA' },
    { time: '10:35 AM', pump: '02', fuel: { type: 'Diesel Pro', color: '#94a3b8' }, amount: '120.00', cost: '168.00', payment: 'CASH' },
    { time: '10:18 AM', pump: '01', fuel: { type: '98 Ultimate', color: '#6366f1' }, amount: '22.50', cost: '41.15', payment: 'APPLE PAY' },
    { time: '09:55 AM', pump: '04', fuel: { type: '95 Octane', color: '#10b981' }, amount: '55.00', cost: '88.00', payment: 'VISA' },
    { time: '09:42 AM', pump: '03', fuel: { type: 'Diesel Pro', color: '#94a3b8' }, amount: '18.40', cost: '25.76', payment: 'CASH' },
  ];

  return (
    <div className="dashboard-container">
      <div className="history-stats-grid">
        <StatCard
          title={t('total_orders')}
          value="1,248"
          icon={<ShoppingBag size={24} />}
          delay={0.1}
          color="#2563eb"
        />
        <StatCard
          title={t('total_sum')}
          value="$42,850.40"
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
            <div className="filter-dropdown">
              <span>{t('all_pumps')}</span>
              <ChevronDown size={16} />
            </div>
            <div className="date-picker-trigger">
              <Calendar size={16} />
              <span>Feb 24, 2025</span>
            </div>
            <button className="export-csv-btn">
              <Download size={16} />
              <span>{t('export_csv')}</span>
            </button>
          </div>
        </div>

        <div className="list-header">
          <div className="tx-col">{t('table_time')}</div>
          <div className="tx-col">{t('table_pump')}</div>
          <div className="tx-col">{t('table_fuel')}</div>
          <div className="tx-col">{t('table_amount')}</div>
          <div className="tx-col">{t('table_cost')}</div>
          <div className="tx-col">{t('table_payment')}</div>
          <div className="tx-col"></div>
        </div>
        <div className="transaction-list">
          {transactions.map((tx, idx) => (
            <TransactionItem key={idx} {...tx} delay={0.3 + idx * 0.05} />
          ))}
        </div>

        <div className="table-pagination-footer">
          <div className="pagination-info">
            {t('showing_transactions', { start: 1, end: transactions.length, total: transactions.length })}
          </div>
          <div className="pagination-controls">
            <button className="page-control-btn disabled">
              <ChevronLeft size={18} />
            </button>
            <button className="page-control-btn active">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
