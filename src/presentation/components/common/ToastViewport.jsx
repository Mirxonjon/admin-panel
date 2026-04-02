import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

const icons = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
};

const colors = {
  success: { border: 'rgba(34, 197, 94, 0.45)', bg: 'rgba(34, 197, 94, 0.10)', fg: '#14532d' },
  error: { border: 'rgba(239, 68, 68, 0.45)', bg: 'rgba(239, 68, 68, 0.10)', fg: '#7f1d1d' },
  info: { border: 'rgba(59, 130, 246, 0.45)', bg: 'rgba(59, 130, 246, 0.10)', fg: '#1e3a8a' },
};

export default function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: 360,
        maxWidth: 'calc(100vw - 32px)',
        pointerEvents: 'none',
      }}
      aria-live="polite"
      aria-relevant="additions removals"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = icons[t.type] || Info;
          const palette = colors[t.type] || colors.info;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 24, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 520, damping: 34, mass: 0.7 }}
              style={{
                pointerEvents: 'auto',
                borderRadius: 14,
                border: `1px solid ${palette.border}`,
                background: `linear-gradient(180deg, ${palette.bg}, rgba(255,255,255,0.86))`,
                boxShadow: '0 14px 35px rgba(0,0,0,0.10)',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', gap: 10, padding: '12px 12px' }}>
                <div style={{ marginTop: 1 }}>
                  <Icon size={18} color={palette.fg} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {t.title ? (
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      {t.title}
                    </div>
                  ) : null}
                  <div
                    style={{
                      fontSize: 13,
                      color: '#0f172a',
                      opacity: 0.88,
                      wordBreak: 'break-word',
                    }}
                  >
                    {t.description}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Close"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 6,
                    borderRadius: 10,
                    color: '#0f172a',
                    opacity: 0.6,
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {t.durationMs > 0 ? (
                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: t.durationMs / 1000, ease: 'linear' }}
                  style={{
                    height: 2,
                    background: palette.border,
                    transformOrigin: 'left',
                  }}
                />
              ) : null}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

