import React, { useEffect, useState } from 'react';
import {
  Send,
  Save,
  Loader2,
  Hash,
  Users,
  Bell,
  BellOff,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiFetch } from '../../core/api/apiFetch';
import { useToastStore } from '../store/useToastStore';
import { getUserFriendlyErrorMessage } from '../../core/api/userFriendlyError';

const TelegramSettings = () => {
  const toastError = useToastStore((s) => s.error);
  const toastSuccess = useToastStore((s) => s.success);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    telegramId: '',
    telegramGroupId: '',
    isActive: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('v1/telegram/settings');
        const data = res?.data ?? res;
        setForm({
          telegramId: data?.telegramId ?? '',
          telegramGroupId: data?.telegramGroupId ?? '',
          isActive: data?.isActive ?? false,
        });
      } catch (err) {
        toastError(getUserFriendlyErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleToggle = () => {
    setForm((prev) => ({ ...prev, isActive: !prev.isActive }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiFetch('v1/telegram/settings', {
        method: 'PATCH',
        body: {
          telegramId: form.telegramId.trim() || null,
          telegramGroupId: form.telegramGroupId.trim() || null,
          isActive: form.isActive,
        },
      });
      toastSuccess('Настройки Telegram успешно сохранены');
      setSaved(true);
    } catch (err) {
      toastError(getUserFriendlyErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '32px 28px', maxWidth: 720, fontFamily: 'inherit' }}>

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: 32 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(42,171,238,0.35)',
          }}>
            <Send size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
              Настройки Telegram
            </h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: 0, marginTop: 2 }}>
              Подключите бота и группу для получения уведомлений
            </p>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748b', padding: '60px 0' }}>
          <Loader2 size={24} style={{ animation: 'tg-spin 1s linear infinite', color: '#2AABEE' }} />
          <span style={{ fontSize: 15 }}>Загрузка настроек...</span>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.08 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >

          {/* ── Status banner ── */}
          <div style={{
            borderRadius: 16,
            background: form.isActive
              ? 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(16,185,129,0.06) 100%)'
              : 'linear-gradient(135deg, rgba(100,116,139,0.07) 0%, rgba(148,163,184,0.05) 100%)',
            border: `1.5px solid ${form.isActive ? 'rgba(34,197,94,0.22)' : 'rgba(203,213,225,0.8)'}`,
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            transition: 'all 0.3s',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: form.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Shield size={18} color={form.isActive ? '#22c55e' : '#94a3b8'} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: form.isActive ? '#15803d' : '#64748b' }}>
                {form.isActive ? 'Уведомления активны' : 'Уведомления отключены'}
              </div>
              <div style={{ fontSize: 12, color: form.isActive ? '#16a34a' : '#94a3b8', marginTop: 1 }}>
                {form.isActive
                  ? 'Сообщения будут отправляться в указанную группу'
                  : 'Включите переключатель ниже, чтобы активировать отправку'}
              </div>
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: form.isActive ? '#22c55e' : '#cbd5e1',
              boxShadow: form.isActive ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none',
              transition: 'all 0.3s',
            }} />
          </div>

          {/* ── Main card ── */}
          <div style={{
            background: '#fff',
            borderRadius: 20,
            border: '1.5px solid #e8edf4',
            boxShadow: '0 4px 24px rgba(15,23,42,0.07)',
            overflow: 'hidden',
          }}>

            {/* Card header */}
            <div style={{
              padding: '20px 24px 18px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'linear-gradient(135deg, #2AABEE 0%, #1a96d4 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(42,171,238,0.3)',
              }}>
                <Send size={17} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Подключение Telegram</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>Введите ID бота и группы</div>
              </div>
            </div>

            {/* Form body */}
            <div style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Telegram ID */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  <Hash size={13} color="#6366f1" />
                  Telegram ID
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="telegramId"
                    value={form.telegramId}
                    onChange={handleChange}
                    placeholder="Например: 123456789"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 12,
                      fontSize: 14,
                      color: '#0f172a',
                      outline: 'none',
                      background: '#fafbff',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.18s, box-shadow 0.18s',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2AABEE';
                      e.target.style.boxShadow = '0 0 0 3px rgba(42,171,238,0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '5px 0 0', paddingLeft: 2 }}>
                  Числовой идентификатор бота или администратора
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: '#f1f5f9', margin: '0 -4px' }} />

              {/* Group ID */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  <Users size={13} color="#6366f1" />
                  ID группы Telegram
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="telegramGroupId"
                    value={form.telegramGroupId}
                    onChange={handleChange}
                    placeholder="Например: -100987654321"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 12,
                      fontSize: 14,
                      color: '#0f172a',
                      outline: 'none',
                      background: '#fafbff',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.18s, box-shadow 0.18s',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2AABEE';
                      e.target.style.boxShadow = '0 0 0 3px rgba(42,171,238,0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '5px 0 0', paddingLeft: 2 }}>
                  ID группы начинается с «-100» (например: -100987654321)
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: '#f1f5f9', margin: '0 -4px' }} />

              {/* Toggle */}
              <div
                onClick={handleToggle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: form.isActive ? 'rgba(34,197,94,0.05)' : '#fafbff',
                  border: `1.5px solid ${form.isActive ? 'rgba(34,197,94,0.2)' : '#e2e8f0'}`,
                  transition: 'all 0.25s',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: form.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.25s',
                  }}>
                    {form.isActive
                      ? <Bell size={17} color="#22c55e" />
                      : <BellOff size={17} color="#94a3b8" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                      Уведомления в группу
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {form.isActive ? 'Включено — сообщения отправляются' : 'Отключено — сообщения не отправляются'}
                    </div>
                  </div>
                </div>

                {/* Custom toggle switch */}
                <div style={{
                  width: 48, height: 26, borderRadius: 13,
                  background: form.isActive ? '#22c55e' : '#cbd5e1',
                  position: 'relative',
                  transition: 'background 0.25s',
                  flexShrink: 0,
                  boxShadow: form.isActive ? '0 2px 8px rgba(34,197,94,0.3)' : 'none',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 3, left: form.isActive ? 25 : 3,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                    transition: 'left 0.22s cubic-bezier(.4,0,.2,1)',
                  }} />
                </div>
              </div>
            </div>

            {/* Card footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#fafbff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              {saved ? (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontSize: 13, fontWeight: 600 }}
                >
                  <CheckCircle2 size={16} />
                  Изменения сохранены
                </motion.div>
              ) : (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Не забудьте сохранить изменения
                </span>
              )}

              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '11px 26px',
                  background: isSaving
                    ? 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)'
                    : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  boxShadow: isSaving ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',
                  transition: 'all 0.18s',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {isSaving ? (
                  <Loader2 size={16} style={{ animation: 'tg-spin 1s linear infinite' }} />
                ) : (
                  <Save size={16} />
                )}
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>

          {/* ── Info card ── */}
          <div style={{
            borderRadius: 14,
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
            border: '1.5px solid rgba(37,99,235,0.12)',
            padding: '16px 18px',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg, #2AABEE 0%, #1a96d4 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(42,171,238,0.28)',
            }}>
              <Send size={15} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>
                Как получить ID группы?
              </div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
                1. Добавьте бота{' '}
                <span style={{
                  background: 'rgba(42,171,238,0.12)',
                  color: '#0369a1',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 5,
                  fontFamily: 'monospace',
                }}>@fuel_go_alert_bot</span>
                {' '}в вашу группу.<br />
                2. Отправьте команду{' '}
                <span style={{
                  background: 'rgba(99,102,241,0.1)',
                  color: '#4f46e5',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 5,
                  fontFamily: 'monospace',
                }}>/start</span>
                {' '}— бот вернёт <strong>Telegram ID</strong> и <strong>Group ID</strong>.<br />
                3. Скопируйте значения и вставьте в поля выше.
              </div>
            </div>
          </div>

        </motion.div>
      )}

      <style>{`
        @keyframes tg-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TelegramSettings;
