import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import '../../styles/layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="layout-container">
      <Sidebar />
      <main className="main-content">
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
