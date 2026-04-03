import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  X,
  Trash2,
  Fuel,
  QrCode,
  Settings,
  Edit2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCodeStyling from 'qr-code-styling';
import { apiFetch } from '../../core/api/apiFetch';
import { useStation } from '../context/StationContext';
import { useToastStore } from '../store/useToastStore';
import { getUserFriendlyErrorMessage } from '../../core/api/userFriendlyError';
import '../styles/layout.css';

const FuelControl = () => {
  const { t } = useTranslation();
  const { selectedStation } = useStation();
  const toastError = useToastStore((s) => s.error);
  const toastSuccess = useToastStore((s) => s.success);
  const Motion = motion;
  const tr = (key, fallback) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const qrPumpIconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="6" fill="#ffffff"/>
      <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2 21h13" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3 9h11" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  const qrPumpIconDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrPumpIconSvg.trim())}`;

  const getPumpQrCodeId = (pump) => {
    const raw = pump?.raw || pump || {};
    return raw?.qrCode ?? raw?.qr_code ?? raw?.qrCodeId ?? raw?.qr_code_id ?? null;
  };

  const downloadPumpQrCode = (pump) => {
    const qrCodeId = getPumpQrCodeId(pump);
    if (!qrCodeId) {
      toastError(tr('error_qr_missing', 'QR kod topilmadi'));
      return;
    }

    // UUID ni QR qilib, markaziga dizaynli ikon qo'yamiz (rasmdagi kabi).
    const qr = new QRCodeStyling({
      width: 380,
      height: 380,
      type: 'canvas',
      data: String(qrCodeId),
      image: qrPumpIconDataUrl,
      margin: 2,
      qrOptions: {
        errorCorrectionLevel: 'Q',
      },
      dotsOptions: {
        color: '#0f172a',
        type: 'square',
        roundSize: true,
      },
      cornersSquareOptions: {
        color: '#0f172a',
        type: 'square',
      },
      cornersDotOptions: {
        color: '#0f172a',
        type: 'square',
      },
      backgroundOptions: {
        color: '#ffffff',
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        imageSize: 0.36,
        margin: 8,
      },
    });

    qr.download({
      name: `pump-qr-${pump?.id ?? 'unknown'}`,
      extension: 'png',
    });
  };

  const getConnectorStatusLabelRU = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'AVAILABLE') return 'Доступно';
    if (s === 'OCCUPIED') return 'Занято';
    if (s === 'OUT_OF_SERVICE') return 'Не в работе';
    // Backwards-compat (some endpoints may still return OUT_OF_STOCK)
    if (s === 'OUT_OF_STOCK' || s === 'UNAVAILABLE' || s === 'NO_STOCK') return 'Нет в наличии';
    return status || '—';
  };

  const getConnectorStatusPillClass = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'AVAILABLE') return 'available';
    return 'out_of_stock';
  };

  const formatUnitRU = (unit) => {
    const u = String(unit || '').toUpperCase();
    if (u === 'LITRE') return 'л';
    if (u === 'M3') return 'м³';
    if (u === 'KWH') return 'кВт·ч';
    if (u === 'KG') return 'кг';
    return unit || '';
  };

  const [pumps, setPumps] = useState([]);

  const [pumpsLoading, setPumpsLoading] = useState(false);

  const [pumpsReloadKey, setPumpsReloadKey] = useState(0);

  const [pumpFuelsLoadedKey, setPumpFuelsLoadedKey] = useState(-1);

  const [selectedFuelPumpId, setSelectedFuelPumpId] = useState(null);
  const [pumpFuels, setPumpFuels] = useState([]);
  const [pumpFuelsLoading, setPumpFuelsLoading] = useState(false);
  const [pumpFuelsReloadKey, setPumpFuelsReloadKey] = useState(0);

  const [fuelTypesOptions, setFuelTypesOptions] = useState([]);
  const [fuelTypesOptionsLoading, setFuelTypesOptionsLoading] = useState(false);
  const [addFuelModalOpen, setAddFuelModalOpen] = useState(false);
  const [addFuelPumpId, setAddFuelPumpId] = useState(null);
  const [addFuelTypeId, setAddFuelTypeId] = useState(null);
  const [addFuelPrice, setAddFuelPrice] = useState('');
  const [addFuelSubmitting, setAddFuelSubmitting] = useState(false);
  const [editingFuelId, setEditingFuelId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [updateModal, setUpdateModal] = useState(null); // pump raw object
  const [updateFuelPumpNumber, setUpdateFuelPumpNumber] = useState('');
  const [updateStatus, setUpdateStatus] = useState('AVAILABLE');
  const [updateSubmitting, setUpdateSubmitting] = useState(false);

  const [createStatus, setCreateStatus] = useState('AVAILABLE');
  const [createFuelPumpNumber, setCreateFuelPumpNumber] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const selectedStationId = useMemo(() => {
    const id = selectedStation?.id;
    if (id === undefined || id === null) return null;
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }, [selectedStation?.id]);

  useEffect(() => {
    if (!selectedStationId) {
      setPumps([]);
      setPumpFuelsLoadedKey(-1);
      setSelectedFuelPumpId(null);
      setPumpFuels([]);
      return;
    }

    let isCancelled = false;
    const fetchPumps = async () => {
      setPumpFuelsLoadedKey(-1);
      setPumpsLoading(true);
      try {
        const res = await apiFetch('v1/pumps', { method: 'GET', params: { stationId: selectedStationId } });
        const items = res?.data?.items;
        const list = Array.isArray(items) ? items : [];

        if (isCancelled) return;

        setPumps(
          list.map((p) => {
            const fuelPumpNumber = p?.fuelPumpNumber ?? p?.fuelPumpNo ?? p?.id;
            const pumpNumStr = fuelPumpNumber !== undefined && fuelPumpNumber !== null
              ? String(fuelPumpNumber).padStart(2, '0')
              : String(p?.id ?? '');

            const isAvailable = String(p?.status || '').toUpperCase() === 'AVAILABLE';
            const backendId = p?.id;
            const backendStatus = String(p?.status || '').toUpperCase();
            const fuelPumpNumberRaw = p?.fuelPumpNumber ?? p?.fuelPumpNo ?? p?.fuel_pump_number ?? null;
            const hardwarePumpNumber = fuelPumpNumberRaw ?? p?.fuelPumpNumber ?? fuelPumpNumber;

            return {
              id: pumpNumStr,
              backendId,
              name: p?.fuelStation?.title || `Pump ${pumpNumStr}`,
              status: isAvailable ? 'active' : 'inactive',
              fuels: [],
              // fuelPumpNumber - station ichidagi "nasos raqami" (UI’da shuni ko‘rsatamiz)
              hardwareId: hardwarePumpNumber != null ? `ТРК-${hardwarePumpNumber}` : (p?.fuelStation?.id ? `ST-${p.fuelStation.id}` : ''),
              backendStatus,
              raw: p,
            };
          })
        );

        // Default select: first pump in station
        const firstId = list?.[0]?.id ?? null;
        setSelectedFuelPumpId((prev) => (prev == null ? firstId : prev));
      } catch (err) {
        if (isCancelled) return;
        toastError(getUserFriendlyErrorMessage(err, t));
        setPumps([]);
        setSelectedFuelPumpId(null);
        setPumpFuels([]);
      }

      if (!isCancelled) {
        setPumpsLoading(false);
      }
    };

    fetchPumps();
    return () => {
      isCancelled = true;
    };
  }, [selectedStationId, toastError, t, pumpsReloadKey]);

  useEffect(() => {
    if (!selectedStationId) return;
    if (pumpsLoading) return;
    if (!Array.isArray(pumps) || pumps.length === 0) return;
    if (pumpFuelsLoadedKey === pumpsReloadKey) return;

    let cancelled = false;

    const fetchPumpFuels = async (pump) => {
      const fuelPumpId = pump?.backendId;
      if (!fuelPumpId) return [];

      // 3-rasmdagi filter: fuelPumpId kiritamiz.
      const res = await apiFetch('v1/pump-fuels', {
        method: 'GET',
        params: {
          page: 1,
          limit: 100,
          fuelPumpId,
        },
      });

      const items =
        res?.data?.items ||
        res?.data?.data ||
        res?.data ||
        res?.items ||
        [];

      const list = Array.isArray(items) ? items : [];

      return list.map((it) => {
        const name = it?.fuelType?.name || it?.fuelName || `Топливо #${it?.fuelTypeId || ''}`;
        const price = it?.price;
        return price != null ? `${name} - ${price} UZS` : name;
      });
    };

    const loadAll = async () => {
      try {
        const results = await Promise.all(
          pumps.map(async (pump) => {
            const fuels = await fetchPumpFuels(pump);
            return { backendId: pump.backendId, fuels };
          })
        );

        if (cancelled) return;

        setPumps((prev) =>
          prev.map((p) => {
            const found = results.find((r) => r.backendId === p.backendId);
            return found ? { ...p, fuels: found.fuels } : p;
          })
        );

        if (!cancelled) setPumpFuelsLoadedKey(pumpsReloadKey);
      } catch (err) {
        if (!cancelled) {
          toastError(getUserFriendlyErrorMessage(err, t));
          // baribir fuels bo‘sh qoldiramiz
          setPumpFuelsLoadedKey(pumpsReloadKey);
        }
      }
    };

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [selectedStationId, pumps, pumpsLoading, pumpsReloadKey, pumpFuelsLoadedKey, toastError, t]);

  useEffect(() => {
    if (!selectedFuelPumpId) {
      setPumpFuels([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setPumpFuelsLoading(true);
      try {
        const res = await apiFetch('v1/pump-fuels', {
          method: 'GET',
          params: {
            page: 1,
            limit: 100,
            fuelPumpId: selectedFuelPumpId,
          },
        });

        const items =
          res?.data?.items ||
          res?.data?.data ||
          res?.data ||
          res?.items ||
          [];

        const list = Array.isArray(items) ? items : [];
        if (!cancelled) setPumpFuels(list);
      } catch (err) {
        if (!cancelled) {
          toastError(getUserFriendlyErrorMessage(err, t));
          setPumpFuels([]);
        }
      } finally {
        if (!cancelled) setPumpFuelsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedFuelPumpId, pumpFuelsReloadKey, toastError, t]);

  useEffect(() => {
    let cancelled = false;
    const loadFuelTypes = async () => {
      setFuelTypesOptionsLoading(true);
      try {
        const res = await apiFetch('v1/fuel-types', { method: 'GET' });
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.items) ? res.data.items : []);
        if (!cancelled) setFuelTypesOptions(list);
      } catch (err) {
        if (!cancelled) {
          toastError(getUserFriendlyErrorMessage(err, t));
          setFuelTypesOptions([]);
        }
      } finally {
        if (!cancelled) setFuelTypesOptionsLoading(false);
      }
    };

    loadFuelTypes();
    return () => {
      cancelled = true;
    };
  }, [toastError, t]);

  const openAddFuelModal = () => {
    setEditingFuelId(null);
    const defaultPumpId = selectedFuelPumpId ?? pumps?.[0]?.backendId ?? null;
    setAddFuelPumpId(defaultPumpId);
    setAddFuelTypeId(fuelTypesOptions?.[0]?.id ?? null);
    setAddFuelPrice('');
    setAddFuelSubmitting(false);
    setAddFuelModalOpen(true);
  };

  const openEditFuelModal = (it) => {
    setEditingFuelId(it.id);
    setAddFuelPumpId(it.fuelPumpId);
    setAddFuelTypeId(it.fuelTypeId);
    setAddFuelPrice(it.price);
    setAddFuelSubmitting(false);
    setAddFuelModalOpen(true);
  };

  const closeAddFuelModal = () => {
    setAddFuelModalOpen(false);
    setAddFuelSubmitting(false);
  };

  const submitAddFuel = async () => {
    const fuelPumpId = Number(addFuelPumpId);
    const fuelTypeId = Number(addFuelTypeId);
    const priceNum = Number(addFuelPrice);

    if (!Number.isFinite(fuelPumpId) || !Number.isFinite(fuelTypeId) || !Number.isFinite(priceNum)) {
      toastError(tr('error_validation', 'Please check the form fields.'));
      return;
    }

    setAddFuelSubmitting(true);
    try {
      const isEdit = editingFuelId !== null;
      const url = isEdit ? `v1/pump-fuels/${editingFuelId}` : 'v1/pump-fuels';
      const method = isEdit ? 'PATCH' : 'POST';

      await apiFetch(url, {
        method,
        body: { fuelPumpId, fuelTypeId, price: priceNum },
      });

      toastSuccess(isEdit ? tr('update_success', 'Updated successfully') : tr('create_success', 'Created successfully'));
      closeAddFuelModal();
      setPumpFuelsReloadKey((k) => k + 1);
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err, t));
      setAddFuelSubmitting(false);
    }
  };

  const deleteFuel = async (it) => {
    try {
      await apiFetch(`v1/pump-fuels/${it.id}`, { method: 'DELETE' });
      toastSuccess(tr('delete_success', 'Deleted successfully'));
      setDeleteConfirmId(null);
      setPumpFuelsReloadKey((k) => k + 1);
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err, t));
    }
  };

  const openUpdateModal = (pump) => {
    const raw = pump?.raw || {};
    setUpdateModal(raw);
    const st = String(raw?.status || '').toUpperCase();
    setUpdateStatus(st || 'AVAILABLE');
    const fpn =
      raw?.fuelPumpNumber != null
        ? String(raw.fuelPumpNumber)
        : raw?.fuelPumpNo != null
          ? String(raw.fuelPumpNo)
          : '';
    setUpdateFuelPumpNumber(fpn);
    setUpdateSubmitting(false);
  };

  const closeUpdateModal = () => {
    setUpdateModal(null);
    setUpdateSubmitting(false);
  };

  const submitUpdate = async () => {
    if (!updateModal) return;
    const backendId = updateModal?.id;
    if (!backendId) return;

    const fuelPumpNumberNum = Number(updateFuelPumpNumber);
    if (!Number.isFinite(fuelPumpNumberNum)) {
      toastError(tr('error_validation', 'Please check the form fields.'));
      return;
    }

    setUpdateSubmitting(true);
    try {
      // stationId o'zgartirilmaydi: faqat backdagi fuelPumpNumber va status yangilanadi.
      await apiFetch(`v1/pumps/${backendId}`, {
        method: 'PATCH',
        body: {
          stationId: selectedStationId,
          status: String(updateStatus || '').toUpperCase(),
          fuelPumpNumber: fuelPumpNumberNum,
        },
      });

      toastSuccess(tr('update_success', 'Updated successfully'));
      closeUpdateModal();
      setPumpsReloadKey((k) => k + 1);
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err, t));
      setUpdateSubmitting(false);
    }
  };

  const deletePump = async (pump) => {
    const backendId = pump?.backendId ?? pump?.raw?.id;
    if (!backendId) return;

    const msg = tr('confirm_delete_pump', `Delete pump #${pump?.id || backendId}?`);
    if (!window.confirm(msg)) return;

    try {
      await apiFetch(`v1/pumps/${backendId}`, { method: 'DELETE' });
      toastSuccess(tr('delete_success', 'Deleted successfully'));
      setPumpsReloadKey((k) => k + 1);
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err, t));
    }
  };

  const openCreateModal = () => {
    if (!selectedStationId) {
      toastError(t('error_validation') || 'Please select station first.');
      return;
    }
    setCreateStatus('AVAILABLE');
    setCreateFuelPumpNumber('');
    setCreateSubmitting(false);
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateSubmitting(false);
  };

  const submitCreate = async () => {
    if (!selectedStationId) return;

    const fuelPumpNumberNum = Number(createFuelPumpNumber);
    if (!Number.isFinite(fuelPumpNumberNum)) {
      toastError(tr('error_validation', 'Please check the form fields.'));
      return;
    }

    setCreateSubmitting(true);
    try {
      await apiFetch('v1/pumps', {
        method: 'POST',
        body: {
          stationId: selectedStationId,
          status: String(createStatus || '').toUpperCase(),
          fuelPumpNumber: fuelPumpNumberNum,
        },
      });

      toastSuccess(tr('create_success', 'Created successfully'));
      closeCreateModal();
      setPumpsReloadKey((k) => k + 1);
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err, t));
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="management-container">
      <header className="management-header">
        <div className="title-section">
          <h1 className="page-title">{t('fuel_pump_management')}</h1>
          <p className="page-subtitle">{t('configure_fuel_pricing')}</p>
        </div>
      </header>

      <section className="management-section">
        <div className="section-header">
          <div className="section-title-group">
            <h2 className="section-title">{t('fuel_inventory_pricing')}</h2>
            <span className="section-subtitle">{t('global_rates')}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  whiteSpace: 'nowrap',
                }}
              >
                ТРК:
              </span>
              <select
                value={selectedFuelPumpId ?? ''}
                onChange={(e) => setSelectedFuelPumpId(e.target.value ? Number(e.target.value) : null)}
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  padding: '0 12px',
                  fontWeight: 700,
                  background: '#fff',
                  minWidth: 180,
                }}
              >
                <option value="" disabled>
                  {pumpsLoading ? 'Загрузка…' : 'Выберите ТРК'}
                </option>
                {(pumps || []).map((p) => (
                  <option key={p.backendId} value={p.backendId}>
                    {`Насос №${p?.raw?.fuelPumpNumber ?? p?.hardwareId?.replace('ТРК-', '') ?? p.backendId}`} • {p.name}
                  </option>
                ))}
              </select>
            </div>

          <button className="add-action-btn premium" type="button" onClick={openAddFuelModal}>
            <Plus size={18} />
            {t('add_fuel_type')}
          </button>
          </div>
        </div>

        {/* Add fuel to pump modal (POST /v1/pump-fuels) */}
        <AnimatePresence>
          {addFuelModalOpen ? (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(2,6,23,0.40)',
                zIndex: 9998,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeAddFuelModal();
              }}
            >
              <Motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                style={{
                  width: 560,
                  maxWidth: '100%',
                  background: '#fff',
                  borderRadius: 18,
                  border: '1px solid rgba(15, 23, 42, 0.10)',
                  boxShadow: '0 28px 80px rgba(0,0,0,0.25)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: 16,
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                      {editingFuelId ? 'Редактировать вид топлива' : 'Добавить вид топлива'}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {editingFuelId ? `PATCH /v1/pump-fuels/${editingFuelId}` : 'POST /v1/pump-fuels'}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="table-action-btn"
                    onClick={closeAddFuelModal}
                    title={tr('close', 'Close')}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ padding: 16, display: 'grid', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>ТРК</span>
                    <select
                      value={addFuelPumpId ?? ''}
                      onChange={(e) => setAddFuelPumpId(e.target.value ? Number(e.target.value) : null)}
                      style={{
                        height: 40,
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        padding: '0 12px',
                        outline: 'none',
                        fontWeight: 700,
                        background: '#fff',
                      }}
                    >
                      <option value="" disabled>
                        {pumpsLoading ? 'Загрузка…' : 'Выберите ТРК'}
                      </option>
                      {(pumps || []).map((p) => (
                        <option key={p.backendId} value={p.backendId}>
                          {`Насос №${p?.raw?.fuelPumpNumber ?? p?.hardwareId?.replace('ТРК-', '') ?? p.backendId}`} • {p.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>Тип топлива</span>
                    <select
                      value={addFuelTypeId ?? ''}
                      onChange={(e) => setAddFuelTypeId(e.target.value ? Number(e.target.value) : null)}
                      disabled={fuelTypesOptionsLoading}
                      style={{
                        height: 40,
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        padding: '0 12px',
                        outline: 'none',
                        fontWeight: 700,
                        background: '#fff',
                      }}
                    >
                      <option value="" disabled>
                        {fuelTypesOptionsLoading ? 'Загрузка…' : 'Выберите топливо'}
                      </option>
                      {(fuelTypesOptions || []).map((ft) => (
                        <option key={ft.id} value={ft.id}>
                          {ft.name}{ft.octane ? ` (${ft.octane})` : ''}{ft.unit ? ` • ${formatUnitRU(ft.unit)}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>Цена (UZS)</span>
                    <input
                      type="number"
                      value={addFuelPrice}
                      onChange={(e) => setAddFuelPrice(e.target.value)}
                      style={{
                        height: 40,
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        padding: '0 12px',
                        outline: 'none',
                        fontWeight: 700,
                      }}
                    />
                  </label>
                </div>

                <div
                  style={{
                    padding: 16,
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    className="register-btn"
                    style={{ background: '#f1f5f9', color: '#0f172a' }}
                    onClick={closeAddFuelModal}
                    disabled={addFuelSubmitting}
                  >
                    {tr('cancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    className="add-action-btn premium"
                    onClick={submitAddFuel}
                    disabled={addFuelSubmitting}
                  >
                    {addFuelSubmitting ? <Loader2 size={18} /> : null}
                    {addFuelSubmitting ? 'Сохранение…' : (editingFuelId ? 'Изменить' : 'Создать')}
                  </button>
                </div>
              </Motion.div>
            </Motion.div>
          ) : null}
        </AnimatePresence>

        <div className="pricing-table-container">
          <table className="management-table">
            <thead>
              <tr>
                <th>{t('fuel_type')}</th>
                <th>{t('current_price')}</th>
                <th>{t('status')}</th>
                <th className="align-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pumpFuelsLoading ? (
                <tr>
                  <td colSpan={4} style={{ padding: 18, opacity: 0.7 }}>
                    {t('loading') || 'Loading…'}
                  </td>
                </tr>
              ) : null}

              {!pumpFuelsLoading && (pumpFuels || []).map((it) => (
                <tr key={it.id} className="table-row-premium">
                  <td>
                    <div className="fuel-type-cell">
                      <div className="fuel-icon-bg">
                        <Fuel size={18} />
                      </div>
                      <div className="fuel-info">
                        <span className="fuel-name">
                          {it?.fuelType?.name || `FuelType #${it.fuelTypeId}`}
                        </span>
                        <span className="fuel-desc">
                          {`ТРК №${it?.fuelPump?.fuelPumpNumber ?? it?.fuelPumpId ?? '—'} • ${it?.fuelType?.octane ? `Октан ${it.fuelType.octane}` : ''}${it?.fuelType?.unit ? ` • ${formatUnitRU(it.fuelType.unit)}` : ''}`}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="price-input-wrapper">
                      <span className="currency-symbol">UZS</span>
                      <input
                        type="text"
                        value={it.price ?? ''}
                        className="price-input"
                        onChange={() => {}}
                        readOnly
                      />
                      <span className="unit-label">
                        {`/${formatUnitRU(it?.fuelType?.unit)}`}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="status-pill block available">
                      {t('available') || 'Доступно'}
                    </span>
                  </td>
                  <td className="align-right" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button 
                        className="table-action-btn" 
                        type="button" 
                        onClick={() => openEditFuelModal(it)}
                        title={tr('edit', 'Edit')}
                        disabled={deleteConfirmId === it.id}
                        style={{ opacity: deleteConfirmId === it.id ? 0.3 : 1 }}
                      >
                        <Edit2 size={18} />
                      </button>
                      <div style={{ position: 'relative' }}>
                        <button 
                          className="table-action-btn delete-hover" 
                          type="button" 
                          onClick={() => setDeleteConfirmId(deleteConfirmId === it.id ? null : it.id)}
                          title={tr('delete', 'Delete')}
                          style={{ color: deleteConfirmId === it.id ? '#94a3b8' : '#dc2626' }}
                        >
                          <Trash2 size={18} />
                        </button>

                        <AnimatePresence>
                          {deleteConfirmId === it.id && (
                            <Motion.div
                              initial={{ opacity: 0, scale: 0.9, x: 10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.9, x: 10 }}
                              style={{
                                position: 'absolute',
                                right: '100%',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                marginRight: 12,
                                background: '#fff',
                                border: '1px solid #fee2e2',
                                borderRadius: 12,
                                boxShadow: '0 10px 25px rgba(220, 38, 38, 0.12)',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                zIndex: 10,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                                Удалить?
                              </span>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => deleteFuel(it)}
                                  style={{
                                    background: '#ef4444',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '4px 10px',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Да
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  style={{
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '4px 10px',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Нет
                                </button>
                              </div>
                            </Motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              {!pumpFuelsLoading && selectedFuelPumpId && (!pumpFuels || pumpFuels.length === 0) ? (
                <tr>
                  <td colSpan={4} style={{ padding: 18, opacity: 0.7 }}>
                    Нет данных
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Update Modal (PATCH /v1/pumps/:id) */}
      <AnimatePresence>
        {updateModal ? (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2,6,23,0.40)',
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeUpdateModal();
            }}
          >
            <Motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              style={{
                width: 520,
                maxWidth: '100%',
                background: '#fff',
                borderRadius: 18,
                border: '1px solid rgba(15, 23, 42, 0.10)',
                boxShadow: '0 28px 80px rgba(0,0,0,0.25)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                    {editingFuelId ? 'Обновить данные' : 'Добавить топливо'}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    ID станции: {selectedStationId}
                  </div>
                </div>

                <button
                  type="button"
                  className="table-action-btn"
                  onClick={closeUpdateModal}
                  title={tr('close', 'Close')}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: 16, display: 'grid', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>Номер насоса</span>
                  <input
                    type="number"
                    value={updateFuelPumpNumber}
                    onChange={(e) => setUpdateFuelPumpNumber(e.target.value)}
                    style={{
                      height: 40,
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      padding: '0 12px',
                      outline: 'none',
                      fontWeight: 700,
                    }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>Статус</span>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    style={{
                      height: 40,
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      padding: '0 12px',
                      outline: 'none',
                      fontWeight: 700,
                      background: '#fff',
                    }}
                  >
                    <option value="AVAILABLE">Доступно</option>
                    <option value="OCCUPIED">Занято</option>
                    <option value="OUT_OF_SERVICE">Не в работе</option>
                  </select>
                </label>
              </div>

              <div
                style={{
                  padding: 16,
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="register-btn"
                  style={{ background: '#f1f5f9', color: '#0f172a' }}
                  onClick={closeUpdateModal}
                  disabled={updateSubmitting}
                >
                  {tr('cancel', 'Отмена')}
                </button>
                <button
                  type="button"
                  className="add-action-btn premium"
                  onClick={submitUpdate}
                  disabled={updateSubmitting}
                >
                  {updateSubmitting ? 'Сохранение…' : 'Обновить'}
                </button>
              </div>
            </Motion.div>
          </Motion.div>
        ) : null}
      </AnimatePresence>

      {/* Create Modal (POST /v1/pumps) */}
      <AnimatePresence>
        {createModalOpen ? (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2,6,23,0.40)',
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeCreateModal();
            }}
          >
            <Motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              style={{
                width: 520,
                maxWidth: '100%',
                background: '#fff',
                borderRadius: 18,
                border: '1px solid rgba(15, 23, 42, 0.10)',
                boxShadow: '0 28px 80px rgba(0,0,0,0.25)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                    Создать ТРК
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    ID станции: {selectedStationId}
                  </div>
                </div>

                <button
                  type="button"
                  className="table-action-btn"
                  onClick={closeCreateModal}
                  title={tr('close', 'Закрыть')}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: 16, display: 'grid', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>
                    Номер насоса
                  </span>
                  <input
                    type="number"
                    value={createFuelPumpNumber}
                    onChange={(e) => setCreateFuelPumpNumber(e.target.value)}
                    style={{
                      height: 40,
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      padding: '0 12px',
                      outline: 'none',
                      fontWeight: 700,
                    }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>
                    Статус
                  </span>
                  <select
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value)}
                    style={{
                      height: 40,
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      padding: '0 12px',
                      outline: 'none',
                      fontWeight: 700,
                      background: '#fff',
                    }}
                  >
                    <option value="AVAILABLE">Доступно</option>
                    <option value="OCCUPIED">Занято</option>
                    <option value="OUT_OF_SERVICE">Не в работе</option>
                  </select>
                </label>
              </div>

              <div
                style={{
                  padding: 16,
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="register-btn"
                  style={{ background: '#f1f5f9', color: '#0f172a' }}
                  onClick={closeCreateModal}
                  disabled={createSubmitting}
                >
                  {tr('cancel', 'Отмена')}
                </button>
                <button
                  type="button"
                  className="add-action-btn premium"
                  onClick={submitCreate}
                  disabled={createSubmitting}
                >
                  {createSubmitting ? 'Сохранение…' : 'Создать'}
                </button>
              </div>
            </Motion.div>
          </Motion.div>
        ) : null}
      </AnimatePresence>

      <section className="management-section">
        <div className="section-header">
          <div className="section-title-group">
            <h2 className="section-title">{t('active_pump_units')}</h2>
            <span className="section-subtitle">{t('pump_config_subtitle')}</span>
          </div>
          <button className="register-btn" type="button" onClick={openCreateModal}>
            <Plus size={18} />
            {t('register_new_pump')}
          </button>
        </div>

        <div className="pumps-grid">
          {pumpsLoading ? (
            <div className="pump-unit-card placeholder" style={{ height: 280 }}>
              <div className="placeholder-content">
                <div className="plus-icon-container">
                  <Loader2 size={20} />
                </div>
                <div className="placeholder-text-group">
                  <span className="placeholder-main">{t('loading') || 'Loading…'}</span>
                  <span className="placeholder-sub">{t('select_station') || 'Select station'}</span>
                </div>
              </div>
            </div>
          ) : null}

          {!pumpsLoading && pumps.map(pump => (
            <div key={pump.id} className="pump-unit-card">
              <div className="pump-card-header">
                <div className="pump-id-badge">{pump.id}</div>
                <h3 className="pump-name">{pump.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`status-pill block ${getConnectorStatusPillClass(pump.backendStatus)}`}>
                    {getConnectorStatusLabelRU(pump.backendStatus)}
                  </span>
                  <div className={`pump-status-indicator ${pump.status === 'active' ? 'active' : ''}`}>
                    {pump.status === 'active' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  </div>
                </div>
              </div>

              <div className="pump-card-body">
                <div className="assignment-section">
                  <span className="tiny-label">{t('assigned_fuels')}</span>
                  <div className="fuel-tags-container">
                    {pump.fuels.map(f => (
                      <div key={f} className="interactive-fuel-tag">
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hardware-info-section">
                  <div className="hardware-id-group">
                    <span className="tiny-label">{t('hardware_id')}</span>
                    <span className="hardware-val">{pump.hardwareId}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      className="configure-link"
                      type="button"
                      onClick={() => downloadPumpQrCode(pump)}
                      title={tr('download_qr', 'QR yuklab olish')}
                      disabled={!getPumpQrCodeId(pump)}
                      style={{
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        opacity: !getPumpQrCodeId(pump) ? 0.45 : 1,
                        cursor: !getPumpQrCodeId(pump) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <QrCode size={18} />
                      <span style={{ fontSize: 14, fontWeight: 700 }}>QR</span>
                    </button>

                    <button
                      className="configure-link"
                      type="button"
                      onClick={() => openUpdateModal(pump)}
                      style={{ color: '#2563eb' }}
                      title={tr('configure', 'Настроить')}
                    >
                      {t('configure')}
                    </button>

                    <button
                      className="configure-link"
                      type="button"
                      onClick={() => deletePump(pump)}
                      title={tr('delete', 'Delete')}
                      style={{ color: '#dc2626' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!pumpsLoading && pumps.length === 0 ? (
            <div className="pump-unit-card placeholder">
              <div className="placeholder-content">
                <div className="plus-icon-container">
                  <Plus size={24} />
                </div>
                <div className="placeholder-text-group">
                  <span className="placeholder-main">{t('initialize_pump', { id: '03' })}</span>
                  <span className="placeholder-sub">{t('deploy_hardware')}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default FuelControl;
