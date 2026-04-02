import React from 'react';
import '../../styles/layout.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-left">
        {/* Placeholder for future page-specific breadcrumbs or titles */}
      </div>

      <div className="header-right">
        {/* Actions moved to the sidebar footer as per request */}
      </div>
    </header>
  );
};

export default Header;
