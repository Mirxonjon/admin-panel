import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './presentation/components/layout/ProtectedRoute';
import Dashboard from './presentation/pages/Dashboard';
import Transactions from './presentation/pages/Transactions';
import Login from './presentation/pages/Login';
import History from './presentation/pages/History';
import FuelControl from './presentation/pages/FuelControl';
import TelegramSettings from './presentation/pages/TelegramSettings';
import { StationProvider } from './presentation/context/StationContext';
import { AuthProvider } from './presentation/context/AuthContext';
import ToastViewport from './presentation/components/common/ToastViewport';

function App() {
  return (
    <AuthProvider>
      <StationProvider>
        <ToastViewport />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes (Authenticated only) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/fuel-control" element={<FuelControl />} />
            <Route path="/history" element={<History />} />
            
            {/* Extended features */}
            <Route path="/users" element={<div>Users Page (Coming Soon)</div>} />
            <Route path="/settings" element={<TelegramSettings />} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </StationProvider>
    </AuthProvider>
  );
}

export default App;
