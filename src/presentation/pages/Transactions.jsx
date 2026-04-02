import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Flame,
  Clock,
  Fuel,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStation } from '../context/StationContext';
import '../styles/layout.css';

const OrderCard = ({ id, fuelType, billing, liters, status, actionLabel, onAction }) => {
  const { t } = useTranslation();
  const isGas = fuelType.toLowerCase().includes('gas') || fuelType.toLowerCase().includes('metan') || fuelType.toLowerCase().includes('propane');
  const unit = isGas ? 'm³' : 'L';

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
        <div className="order-value">${billing}</div>
      </div>

      <div className="order-volume">
        <span className="volume-label">{t('volume')}</span>
        <span className="volume-value">{liters} {unit}</span>
      </div>

      <button
        className="order-action-btn"
        onClick={onAction}
      >
        {actionLabel}
        <ArrowRight size={16} />
      </button>
    </motion.div>
  );
};

const Transactions = () => {
  const { t } = useTranslation();
  const { nodes, confirmOrder, finishOrder } = useStation();

  // Filter nodes that are in 'paid' or 'busy' states for the queue
  const paidOrders = nodes.filter(n => n.status === 'paid');
  const fuelingOrders = nodes.filter(n => n.status === 'busy');

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
            <span className="stat-value">{paidOrders.length + fuelingOrders.length} {t('orders_count')}</span>
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
            <span className="count-badge">{paidOrders.length}</span>
          </div>

          <div className="order-list">
            <AnimatePresence>
              {paidOrders.map((node) => (
                <OrderCard
                  key={node.id}
                  {...node}
                  actionLabel={t('confirm_payout')}
                  onAction={() => confirmOrder(node.id)}
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
            <span className="count-badge active">{fuelingOrders.length}</span>
          </div>

          <div className="order-list">
            <AnimatePresence>
              {fuelingOrders.map((node) => (
                <OrderCard
                  key={node.id}
                  {...node}
                  actionLabel={t('finish_order')}
                  onAction={() => finishOrder(node.id)}
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
