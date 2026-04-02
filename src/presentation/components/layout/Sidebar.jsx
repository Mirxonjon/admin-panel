import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  Flame,
  History,
  LogOut,
  MapPin,
  MapPinned,
  User,
  ChevronDown
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useStation } from '../../context/StationContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import '../../styles/layout.css';

const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { stations, selectedStation, selectStation, isStationsLoading } = useStation();
  const [isStationMenuOpen, setIsStationMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { title: t('dashboard'), icon: <LayoutDashboard size={22} />, path: '/dashboard' },
    { title: t('transactions'), icon: <Wallet size={22} />, path: '/transactions' },
    { title: t('fuel_control'), icon: <Flame size={22} />, path: '/fuel-control' },
    { title: t('history'), icon: <History size={22} />, path: '/history' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="station-brand">
          <div className="station-icon">
            <MapPin size={24} />
          </div>
          <div className="station-info">
            <h3 className="station-name">
              {selectedStation?.title || t('station_name')}
            </h3>
            <span className="station-id-label">
              {selectedStation?.address || (isStationsLoading ? t('loading') || 'Loading…' : '')}
            </span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <div className="nav-icon-wrapper">
              {item.icon}
            </div>
            <span className="nav-label">{item.title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-actions">
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="nav-item"
              onClick={() => setIsStationMenuOpen((v) => !v)}
              style={{
                width: '100%',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                marginBottom: 10,
              }}
            >
              <div className="nav-icon-wrapper">
                <MapPinned size={22} />
              </div>
              <span className="nav-label">{t('stations') || 'Stations'}</span>
              <span style={{ marginLeft: 'auto', opacity: 0.65 }}>
                <ChevronDown size={18} />
              </span>
            </button>

            <button
              type="button"
              className="footer-action-item profile-mini"
              style={{ width: '100%', cursor: 'default', border: 'none', background: 'transparent' }}
            >
            <div className="profile-avatar-mini nav-icon-wrapper">
              <User size={20} />
            </div>
            <div className="profile-info-mini nav-label">
              <span className="profile-name-mini">{t('user_name')}</span>
              <span className="profile-role-mini">{t('user_role')}</span>
            </div>
            </button>

            <AnimatePresence>
              {isStationMenuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34, mass: 0.8 }}
                  style={{
                    position: 'absolute',
                    bottom: 114,
                    left: 0,
                    right: 0,
                    background: 'rgba(255,255,255,0.98)',
                    border: '1px solid rgba(15, 23, 42, 0.10)',
                    borderRadius: 14,
                    boxShadow: '0 18px 40px rgba(0,0,0,0.14)',
                    overflow: 'hidden',
                    zIndex: 10,
                  }}
                >
                  <div style={{ padding: 10, fontSize: 12, opacity: 0.7 }}>
                    {t('select_station') || 'Select station'}
                  </div>
                  <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                    {(stations || []).map((s) => {
                      const isSelected = selectedStation?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            selectStation(s.id);
                            setIsStationMenuOpen(false);
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 12px',
                            border: 'none',
                            background: isSelected ? 'rgba(59, 130, 246, 0.10)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                            {s.title}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.75 }}>
                            {s.address}
                          </div>
                        </button>
                      );
                    })}
                    {!isStationsLoading && (!stations || stations.length === 0) ? (
                      <div style={{ padding: 12, fontSize: 13, opacity: 0.7 }}>
                        {t('no_stations') || 'No stations found'}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <button className="nav-item logout-btn" onClick={handleLogout}>
          <div className="nav-icon-wrapper">
            <LogOut size={22} />
          </div>
          <span className="nav-label">{t('logout')}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
