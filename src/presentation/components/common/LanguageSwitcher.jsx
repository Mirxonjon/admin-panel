import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LanguageSwitcher = ({ variant = 'default' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  const languages = [
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ];

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const toggleDropdown = () => setIsOpen(!isOpen);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
    localStorage.setItem('i18nextLng', code);
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'simple') {
    return (
      <div style={{ display: 'flex', gap: 6, background: 'rgba(241, 245, 249, 0.5)', padding: 4, borderRadius: 10 }}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: 'none',
              background: i18n.language === lang.code ? '#fff' : 'transparent',
              color: i18n.language === lang.code ? '#0f172a' : '#64748b',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: i18n.language === lang.code ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {lang.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={toggleDropdown}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          borderRadius: 12,
          border: '1px solid rgba(226, 232, 240, 0.8)',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOpen ? '0 4px 12px rgba(0, 0, 0, 0.05)' : '0 1px 2px rgba(0,0,0,0.02)',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.background = '#fff';
        }}
        onMouseLeave={(e) => {
            if (!isOpen) {
                e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
            }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#eff6ff', borderRadius: 8 }}>
            <Globe size={13} color="#2563eb" />
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', letterSpacing: '0.02em' }}>
          {currentLang.code.toUpperCase()}
        </span>
        <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{ display: 'flex' }}
        >
            <ChevronDown size={14} color="#94a3b8" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              borderRadius: 16,
              border: '1px solid rgba(15, 23, 42, 0.08)',
              boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)',
              padding: 8,
              zIndex: 1000,
              minWidth: 160,
              transformOrigin: 'top right'
            }}
          >
            {languages.map((lang) => {
              const isSelected = i18n.language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: 'none',
                    background: isSelected ? '#eff6ff' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: 18, filter: isSelected ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' : 'none' }}>{lang.flag}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 800 : 600, color: isSelected ? '#1e40af' : '#475569' }}>
                      {lang.label}
                    </span>
                    {isSelected && (
                        <motion.div 
                            layoutId="active-indicator"
                            className="active-indicator"
                            style={{ position: 'absolute', right: 12, width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }}
                        />
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;
