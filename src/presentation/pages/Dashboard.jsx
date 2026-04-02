import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Fuel, 
  Wallet, 
  Power, 
  CheckCircle2, 
  Activity,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStation } from '../context/StationContext';
import '../styles/layout.css';

const NodeCard = ({ id, fuelType, status, liters, billing, progress, onConfirm, onFinish }) => {
  const { t } = useTranslation();
  const isBusy = status === 'busy';
  const isPaid = status === 'paid';
  const isReady = status === 'ready';
  const isFinished = isBusy;

  const renderContent = () => {
    if (isReady) {
      return (
        <div className="ready-placeholder">
          <div className="ready-icon-bg">
            <Power size={22} />
          </div>
          <span className="ready-text">{t('available_for_fueling')}</span>
        </div>
      );
    }

    if (isPaid) {
      return (
        <div className="paid-checkout-card">
          <div className="checkout-summary">
            <span className="checkout-label">{t('total_transaction')}</span>
            <div className="checkout-amount-group">
              <span className="currency">$</span>
              <span className="amount">{billing}</span>
            </div>
          </div>
          <button className="confirm-payout-btn premium" onClick={() => onConfirm(id)}>
            <CheckCircle2 size={18} />
            {t('confirm_payout').toUpperCase()}
          </button>
        </div>
      );
    }

    if (isBusy) {
      return (
        <div className="busy-status-card">
          <div className="busy-metrics">
            <div className="busy-metric-item">
              <span className="busy-label">{t('liters_dispensed')}</span>
              <div className="busy-value">
                {liters} <span className="unit">L</span>
              </div>
            </div>
            <div className="busy-metric-item align-right">
              <span className="busy-label">{t('est_billing')}</span>
              <div className="busy-value price">
                ${billing}
              </div>
            </div>
          </div>

          {isFinished && (
            <button 
              className="node-action-btn finish-highlight" 
              onClick={() => onFinish(id)}
            >
              <CheckCircle2 size={16} />
              {t('finish_order').toUpperCase()}
            </button>
          )}
        </div>
      );
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`node-monitor-card ${status} ${isFinished ? 'is-finished' : ''}`}
    >
      <div className="node-monitor-header">
        <div className="node-info-main">
          <div className={`node-icon-status ${status}`}>
            {isBusy ? <Fuel size={20} /> : isReady ? <Power size={20} /> : <Wallet size={20} />}
          </div>
          <div className="node-title-group">
            <span className="node-number">{id}</span>
            <span className="node-fuel-type">{fuelType}</span>
          </div>
        </div>
        
        <span className={`status-pill ${status}`}>
          {t(status).toUpperCase()}
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
  const { nodes, confirmOrder, finishOrder } = useStation();

  const activeCount = nodes.filter(n => n.status !== 'ready').length;
  const readyCount = nodes.filter(n => n.status === 'ready').length;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="title-section">
          <h1 className="page-title">{t('command_center')}</h1>
          <p className="page-subtitle">{t('real_time_logistics')} • {t('node_network', { count: nodes.length })}</p>
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
        </div>
      </header>

      <div className="command-center-grid">
        {nodes.map(node => (
          <NodeCard 
            key={node.id} 
            {...node} 
            onConfirm={confirmOrder}
            onFinish={finishOrder}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
