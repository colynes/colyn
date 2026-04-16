import React, { useEffect, useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ShoppingCart, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const CART_POSITION_KEY = 'customer-cart-floating-position';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function CustomerCartPanel() {
  const { t } = useI18n();
  const { auth, cart = { items: [], subtotal: 0, line_count: 0 } } = usePage().props;
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [position, setPosition] = useState({ x: null, y: null });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const saved = window.localStorage.getItem(CART_POSITION_KEY);
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);
      if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
        setPosition({ x: parsed.x, y: parsed.y });
      }
    } catch {
      // Ignore invalid saved position and fall back to the default corner.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || position.x === null || position.y === null) {
      return;
    }

    window.localStorage.setItem(CART_POSITION_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragRef.current.active || !wrapperRef.current) {
        return;
      }

      const deltaX = Math.abs(event.clientX - dragRef.current.startX);
      const deltaY = Math.abs(event.clientY - dragRef.current.startY);
      if (deltaX > 6 || deltaY > 6) {
        dragRef.current.moved = true;
      }

      const wrapperWidth = wrapperRef.current.offsetWidth;
      const wrapperHeight = wrapperRef.current.offsetHeight;
      const maxX = Math.max(16, window.innerWidth - wrapperWidth - 16);
      const maxY = Math.max(16, window.innerHeight - wrapperHeight - 16);

      setPosition({
        x: Math.min(Math.max(16, event.clientX - dragRef.current.offsetX), maxX),
        y: Math.min(Math.max(16, event.clientY - dragRef.current.offsetY), maxY),
      });
    };

    const stopDragging = () => {
      dragRef.current.active = false;
      if (
        dragRef.current.pointerId !== null &&
        buttonRef.current?.hasPointerCapture?.(dragRef.current.pointerId)
      ) {
        buttonRef.current.releasePointerCapture(dragRef.current.pointerId);
      }
      dragRef.current.pointerId = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const clampPosition = () => {
      if (!wrapperRef.current || position.x === null || position.y === null) {
        return;
      }

      const wrapperWidth = wrapperRef.current.offsetWidth;
      const wrapperHeight = wrapperRef.current.offsetHeight;
      const maxX = Math.max(16, window.innerWidth - wrapperWidth - 16);
      const maxY = Math.max(16, window.innerHeight - wrapperHeight - 16);

      setPosition((current) => {
        if (current.x === null || current.y === null) {
          return current;
        }

        const next = {
          x: Math.min(Math.max(16, current.x), maxX),
          y: Math.min(Math.max(16, current.y), maxY),
        };

        if (next.x === current.x && next.y === current.y) {
          return current;
        }

        return next;
      });
    };

    window.addEventListener('resize', clampPosition);
    clampPosition();

    return () => {
      window.removeEventListener('resize', clampPosition);
    };
  }, [position.x, position.y]);

  if (!auth?.user || (cart?.line_count || 0) === 0) {
    return null;
  }

  const startDragging = (event) => {
    if (!wrapperRef.current) {
      return;
    }

    const rect = wrapperRef.current.getBoundingClientRect();
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    buttonRef.current?.setPointerCapture?.(event.pointerId);

    if (position.x === null || position.y === null) {
      setPosition({ x: rect.left, y: rect.top });
    }
  };

  const handleButtonClick = () => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }

    setOpen((current) => !current);
  };

  return (
    <aside>
      <div
        ref={wrapperRef}
        className="fixed z-30"
        style={{
          right: position.x === null ? '1rem' : 'auto',
          bottom: position.x === null ? '1rem' : 'auto',
          top: position.y === null ? 'auto' : `${position.y}px`,
          left: position.x === null ? 'auto' : `${position.x}px`,
        }}
      >
        {open && (
          <div className="absolute bottom-[calc(100%+12px)] right-0 w-[17rem] rounded-[1.75rem] border border-[var(--color-sys-border)] bg-white/95 p-5 shadow-[0_18px_50px_rgba(44,30,22,0.12)] backdrop-blur sm:w-80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-sys-text-secondary)]">{t('frontend.customer_cart_panel.title', 'Your Cart')}</p>
                <h3 className="mt-2 text-xl font-black text-[var(--color-sys-text-primary)]">{t('frontend.customer_cart_panel.subtitle', 'Cart details')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[var(--color-sys-border)] p-2 text-[var(--color-sys-text-secondary)] transition hover:text-[var(--color-sys-text-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={item.line_id} className="rounded-2xl bg-[#f4eee5] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-sys-text-primary)]">{item.name}</p>
                      <p className="mt-1 text-xs text-[var(--color-sys-text-secondary)]">
                        {`${t('frontend.common.labels.qty_unit', 'Qty :quantity • :unit').replace(':quantity', item.quantity).replace(':unit', item.unit)}`}
                      </p>
                    </div>
                    <p className="text-sm font-black text-[var(--color-sys-text-primary)]">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-[var(--color-sys-border)] pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-sys-text-secondary)]">{t('frontend.common.labels.subtotal', 'Subtotal')}</span>
                <span className="text-lg font-black text-[var(--color-sys-text-primary)]">{formatCurrency(cart?.subtotal || 0)}</span>
              </div>
              <div className="mt-4 grid gap-3">
                <Link href="/cart" className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-sys-border)] px-4 py-3 text-sm font-semibold text-[var(--color-sys-text-primary)]">
                  {t('frontend.common.open_cart', 'Open cart')}
                </Link>
                <Link href="/checkout" className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] px-4 py-3 text-sm font-semibold text-white">
                  {t('frontend.common.confirm_order', 'Confirm order')}
                </Link>
              </div>
            </div>
          </div>
        )}

        <button
          ref={buttonRef}
          type="button"
          onPointerDown={startDragging}
          onClick={handleButtonClick}
          className="relative flex h-13 w-13 cursor-grab items-center justify-center rounded-full bg-[var(--color-brand-dark)] text-white shadow-[0_18px_50px_rgba(44,30,22,0.22)] select-none transition hover:bg-[#4a3527] active:cursor-grabbing sm:h-16 sm:w-16"
          aria-label={t('frontend.customer_cart_panel.open_live_cart', 'Open live cart')}
          style={{ touchAction: 'none' }}
        >
          <ShoppingCart size={20} />
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#a42828] px-1 text-[9px] font-bold text-white sm:min-h-6 sm:min-w-6 sm:text-[10px]">
            {cart?.line_count || 0}
          </span>
        </button>
      </div>
    </aside>
  );
}
