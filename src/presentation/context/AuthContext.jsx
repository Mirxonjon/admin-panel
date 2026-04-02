import React, { createContext, useContext, useMemo, useState } from 'react';
import { apiFetch } from '../../core/api/apiFetch';
import { clearAuthTokens, getAccessToken, setAccessToken, setRefreshToken } from '../../core/auth/tokenStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessTokenState] = useState(() => getAccessToken());

  const isAuthenticated = !!accessToken;

  const login = async (stationIdOrPhone, accessKeyOrPassword, remember) => {
    const payload = {
      phone: stationIdOrPhone,
      password: accessKeyOrPassword,
    };

    const res = await apiFetch('v1/admin/login', { method: 'POST', body: payload });
    const token =
      res?.data?.accessToken ||
      res?.accessToken ||
      res?.data?.token ||
      res?.token;

    if (!token) {
      throw new Error('Login response did not include accessToken');
    }

    setAccessToken(token);
    setAccessTokenState(token);

    const refresh =
      res?.data?.refreshToken ||
      res?.refreshToken;
    if (refresh) setRefreshToken(refresh);

    if (remember) {
      localStorage.setItem('saved_cashier_phone', stationIdOrPhone);
    } else {
      localStorage.removeItem('saved_cashier_phone');
      localStorage.removeItem('saved_station_id'); // cleanup old key
    }

    return true;
  };

  const logout = () => {
    clearAuthTokens();
    setAccessTokenState(null);
  };

  const value = useMemo(
    () => ({ isAuthenticated, accessToken, login, logout }),
    [isAuthenticated, accessToken]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
