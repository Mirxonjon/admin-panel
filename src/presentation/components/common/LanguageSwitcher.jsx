import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const currentLang = i18n.language;

  return (
    <div className="language-switcher" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Globe size={18} color="var(--text-secondary)" />
      <select 
        value={currentLang} 
        onChange={(e) => changeLanguage(e.target.value)}
        style={{
          background: 'none',
          color: 'var(--text-primary)',
          border: 'none',
          outline: 'none',
          fontSize: '14px',
          cursor: 'pointer'
        }}
      >
        <option value="en">English</option>
        <option value="ru">Русский</option>
        <option value="uz">O'zbekcha</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
