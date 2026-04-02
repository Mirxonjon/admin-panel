import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../core/api/apiFetch';
import { getUserFriendlyErrorMessage } from '../../core/api/userFriendlyError';
import { useToastStore } from '../store/useToastStore';
import { useAuth } from './AuthContext';

const StationContext = createContext();

export const useStation = () => {
  const context = useContext(StationContext);
  if (!context) {
    throw new Error('useStation must be used within a StationProvider');
  }
  return context;
};

export const StationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const toastError = useToastStore((s) => s.error);

  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(() => {
    const raw = localStorage.getItem('selected_station_id');
    const id = raw ? Number(raw) : null;
    return Number.isFinite(id) ? id : null;
  });
  const [isStationsLoading, setIsStationsLoading] = useState(false);

  const [nodes, setNodes] = useState([
    { id: '01', fuelType: '92 Premium', status: 'ready', liters: 0, billing: 0, progress: 0 },
    { id: '02', fuelType: 'Diesel Extra', status: 'ready', liters: 0, billing: 0, progress: 0 },
    { id: '03', fuelType: '95 Super', status: 'ready', liters: 0, billing: 0, progress: 0 },
    { id: '04', fuelType: '92 Premium', status: 'ready', liters: 0, billing: 0, progress: 0 },
    { id: '05', fuelType: 'Propane', status: 'ready', liters: 0, billing: 0, progress: 0 },
    { id: '06', fuelType: 'Metan', status: 'ready', liters: 0, billing: 0, progress: 0 },
    { id: '07', fuelType: '92 Premium', status: 'ready', liters: 0, billing: 0, progress: 0 },
    { id: '08', fuelType: 'Diesel Extra', status: 'ready', liters: 0, billing: 0, progress: 0 },
  ]);

  // Initial Mock: Simulate some orders coming in
  useEffect(() => {
    // Start with some columns already having orders
    receivePayment('01', '32.45', '54.20');
    receivePayment('02', '45.10', '112.50');
    receivePayment('04', '12.10', '21.85');

    // Automatically transition 04 to BUSY for demonstration
    setTimeout(() => confirmOrder('04'), 1000);
  }, []);

  // Simulation of filling progress
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => prev.map(node => {
        if (node.status === 'busy' && node.progress < 100) {
          return { ...node, progress: Math.min(node.progress + 5, 100) };
        }
        return node;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedStation = useMemo(() => {
    if (!stations?.length) return null;
    if (selectedStationId == null) return stations[0];
    return stations.find((s) => s.id === selectedStationId) || stations[0];
  }, [stations, selectedStationId]);

  const fetchStations = async () => {
    setIsStationsLoading(true);
    try {
      const res = await apiFetch('v1/auth/my-stations', { method: 'GET' });
      const list = res?.data || [];
      setStations(Array.isArray(list) ? list : []);

      const stored = localStorage.getItem('selected_station_id');
      const storedId = stored ? Number(stored) : null;
      const hasStored = Number.isFinite(storedId) && list.some((s) => s.id === storedId);
      const nextId = hasStored ? storedId : list?.[0]?.id ?? null;

      if (nextId != null) {
        localStorage.setItem('selected_station_id', String(nextId));
      } else {
        localStorage.removeItem('selected_station_id');
      }
      setSelectedStationId(nextId);
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err));
      setStations([]);
      setSelectedStationId(null);
      localStorage.removeItem('selected_station_id');
    } finally {
      setIsStationsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setStations([]);
      setSelectedStationId(null);
      localStorage.removeItem('selected_station_id');
      return;
    }
    fetchStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const selectStation = (stationId) => {
    const id = Number(stationId);
    if (!Number.isFinite(id)) return;
    setSelectedStationId(id);
    localStorage.setItem('selected_station_id', String(id));
  };

  const receivePayment = (nodeId, liters, billing) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, status: 'paid', liters, billing, progress: 0 }
        : node
    ));
  };

  const confirmOrder = (nodeId) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, status: 'busy', progress: 10 }
        : node
    ));
  };

  const finishOrder = (nodeId) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, status: 'ready', liters: 0, billing: 0, progress: 0 }
        : node
    ));
  };

  const value = {
    stations,
    selectedStation,
    selectedStationId,
    selectStation,
    fetchStations,
    isStationsLoading,
    nodes,
    receivePayment,
    confirmOrder,
    finishOrder
  };

  return (
    <StationContext.Provider value={value}>
      {children}
    </StationContext.Provider>
  );
};
