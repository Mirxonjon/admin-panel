import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Fuel, Key, Eye, EyeOff, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToastStore } from '../store/useToastStore';
import { getUserFriendlyErrorMessage } from '../../core/api/userFriendlyError';
import '../styles/login.css';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const toastSuccess = useToastStore((s) => s.success);
  const toastError = useToastStore((s) => s.error);
  
  const [showPassword, setShowPassword] = useState(false);
  const [stationId, setStationId] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const SAVED_CASHIER_KEY = 'saved_cashier_phone';

  useEffect(() => {
    const saved =
      localStorage.getItem(SAVED_CASHIER_KEY) ||
      localStorage.getItem('saved_station_id'); // backward compatibility
    if (saved) {
      setStationId(saved);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(stationId, accessKey, remember);
      toastSuccess(t('login_success') || 'Logged in');
      navigate('/dashboard');
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err, t));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="login-header"
      >
        <div className="login-logo-container">
          <Fuel size={32} />
        </div>
        <h1 className="login-title">{t('login_title')}</h1>
        <p className="login-subtitle">{t('login_subtitle')}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="login-card"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <div className="label-left">
                <Lock size={14} style={{ opacity: 0.6 }} />
                <span>{t('station_id')}</span>
              </div>
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                className="login-input"
                placeholder={t('enter_station_id')}
                value={stationId}
                onChange={(e) => {
                  const val = e.target.value;
                  setStationId(val);
                  if (remember) {
                    localStorage.setItem(SAVED_CASHIER_KEY, val);
                  }
                }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <div className="label-left">
                <Key size={14} style={{ opacity: 0.6 }} />
                <span>{t('access_key')}</span>
              </div>
              <a href="#" className="forgot-link">{t('forgot')}</a>
            </label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="••••••••"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-footer">
            <label className="remember-me">
              <input
                type="checkbox"
                className="remember-checkbox"
                hidden
                checked={remember}
                onChange={() => {
                  setRemember((v) => {
                    const next = !v;
                    if (next) {
                      localStorage.setItem(SAVED_CASHIER_KEY, stationId);
                    } else {
                      localStorage.removeItem(SAVED_CASHIER_KEY);
                    }
                    return next;
                  });
                }}
              />
              <div className="toggle-switch"></div>
              <span className="remember-text">{t('remember_station')}</span>
            </label>
          </div>

          <button type="submit" className="submit-button" disabled={isLoading}>
            <span>{isLoading ? t('authenticating') || 'Authorization...' : t('enter_station')}</span>
            {isLoading ? (
              <Loader2 className="spinner" size={20} />
            ) : (
              <ArrowRight size={20} />
            )}
          </button>
        </form>
      </motion.div>

      <div className="login-footer-links">
        <a href="#" className="footer-link">{t('support')}</a>
        <a href="#" className="footer-link">{t('security_policy')}</a>
      </div>
      <p className="copyright">{t('copyright')}</p>
    </div>
  );
};

export default Login;
