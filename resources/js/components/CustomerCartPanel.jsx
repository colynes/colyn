import React, { useEffect, useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ShoppingCart, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const MOBILE_BREAKPOINT = 640;
const CART_POSITION_KEY = 'customer-cart-floating-position';
const DRAG_THRESHOLD = 6;
const FALLBACK_BUTTON_SIZE = 64;

function formatCurrency(value) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function clampPosition(position, viewport, element) {
  const maxX = Math.max(0, viewport.width - element.width);
  const maxY = Math.max(0, viewport.height - element.height);

  return {
    x: Math.min(Math.max(0, position.x), maxX),
    y: Math.min(Math.max(0, position.y), maxY),
  };
}

function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export default function CustomerCartPanel() {
  const { t } = useI18n();
  const { auth, cart = { items: [], subtotal: 0, line_count: 0 } } = usePage().props;
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ x: null, y: null });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncViewport = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
    };
  }, []);

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
    if (typeof window === 'undefined' || !wrapperRef.current) {
      return undefined;
    }

    if (position.x !== null && position.y !== null) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      if (!wrapperRef.current) {
        return;
      }

      const rect = wrapperRef.current.getBoundingClientRect();
      const viewport = getViewportSize();
      const nextPosition = clampPosition(
        {
          x: viewport.width - rect.width,
          y: viewport.height - rect.height,
        },
        viewport,
        { width: rect.width, height: rect.height },
      );

      setPosition(nextPosition);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [position.x, position.y, isMobile]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        !wrapperRef.current?.contains(event.target) &&
        !panelRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
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

    const handlePointerMove = (event) => {
      if (!dragRef.current.active || !wrapperRef.current) {
        return;
      }

      const deltaX = Math.abs(event.clientX - dragRef.current.startX);
      const deltaY = Math.abs(event.clientY - dragRef.current.startY);
      if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
        dragRef.current.moved = true;
      }

      const rect = wrapperRef.current.getBoundingClientRect();
      const viewport = getViewportSize();
      const nextPosition = clampPosition(
        {
          x: event.clientX - dragRef.current.offsetX,
          y: event.clientY - dragRef.current.offsetY,
        },
        viewport,
        { width: rect.width, height: rect.height },
      );

      setPosition(nextPosition);
    };

    const handlePointerUp = () => {
      if (dragRef.current.moved) {
        setOpen(false);
      }

      stopDragging();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, []);

  useEffect(() => {
    const clampCurrentPosition = () => {
      if (!wrapperRef.current || position.x === null || position.y === null) {
        return;
      }

      const rect = wrapperRef.current.getBoundingClientRect();
      const viewport = getViewportSize();

      setPosition((current) => {
        if (current.x === null || current.y === null) {
          return current;
        }

        const next = clampPosition(current, viewport, { width: rect.width, height: rect.height });

        if (next.x === current.x && next.y === current.y) {
          return current;
        }

        return next;
      });
    };

    window.addEventListener('resize', clampCurrentPosition);

    return () => {
      window.removeEventListener('resize', clampCurrentPosition);
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
  };

  const handleButtonClick = () => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }

    setOpen((current) => !current);
  };

  const resolvedX = position.x ?? 0;
  const resolvedY = position.y ?? 0;
  const buttonWidth = wrapperRef.current?.offsetWidth || FALLBACK_BUTTON_SIZE;
  const buttonHeight = wrapperRef.current?.offsetHeight || FALLBACK_BUTTON_SIZE;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
  const horizontalPlacement = resolvedX + buttonWidth / 2 < viewportWidth / 2 ? 'left-0' : 'right-0';
  const verticalPlacement = resolvedY + buttonHeight / 2 < viewportHeight / 2 ? 'top-[calc(100%+12px)]' : 'bottom-[calc(100%+12px)]';

  const cartPanelContent = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-sys-text-secondary)]">
            {t('frontend.customer_cart_panel.title', 'Your Cart')}
          </p>
          <h3 className="mt-2 text-xl font-black text-[var(--color-sys-text-primary)]">
            {t('frontend.customer_cart_panel.subtitle', 'Cart details')}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-[var(--color-sys-border)] p-2 text-[var(--color-sys-text-secondary)] transition hover:text-[var(--color-sys-text-primary)]"
          aria-label={t('frontend.customer_cart_panel.close_live_cart', 'Close live cart')}
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-5 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
        {cart.items.map((item) => (
          <div key={item.line_id} className="rounded-2xl bg-[#f4eee5] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--color-sys-text-primary)]">{item.name}</p>
                <p className="mt-1 text-xs text-[var(--color-sys-text-secondary)]">
                  {`${t('frontend.common.labels.qty_unit', 'Qty :quantity - :unit').replace(':quantity', item.quantity).replace(':unit', item.unit)}`}
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
          <span className="text-sm text-[var(--color-sys-text-secondary)]">
            {t('frontend.common.labels.subtotal', 'Subtotal')}
          </span>
          <span className="text-lg font-black text-[var(--color-sys-text-primary)]">
            {formatCurrency(cart?.subtotal || 0)}
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          <Link
            href="/cart"
            className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-sys-border)] px-4 py-3 text-sm font-semibold text-[var(--color-sys-text-primary)]"
          >
            {t('frontend.common.open_cart', 'Open cart')}
          </Link>
          <Link
            href="/checkout"
            className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] px-4 py-3 text-sm font-semibold text-white"
          >
            {t('frontend.common.confirm_order', 'Confirm order')}
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <aside>
      {open && isMobile && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/45 px-4 py-6 backdrop-blur-sm sm:hidden">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0"
            aria-label={t('frontend.customer_cart_panel.close_live_cart', 'Close live cart')}
          />
          <div
            ref={panelRef}
            className="relative flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-[var(--color-sys-border)] bg-white p-5 shadow-[0_24px_60px_rgba(44,30,22,0.18)]"
          >
            {cartPanelContent}
          </div>
        </div>
      )}

      <div
        ref={wrapperRef}
        className="fixed z-30"
        style={position.x === null || position.y === null ? { visibility: 'hidden' } : {
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {open && !isMobile && (
          <div
            ref={panelRef}
            className={`absolute w-[17rem] rounded-[1.75rem] border border-[var(--color-sys-border)] bg-white/95 p-5 shadow-[0_18px_50px_rgba(44,30,22,0.12)] backdrop-blur sm:w-80 ${horizontalPlacement} ${verticalPlacement}`}
          >
            {cartPanelContent}
          </div>
        )}

        {(!open || !isMobile) && (
          <button
            ref={buttonRef}
            type="button"
            onPointerDown={startDragging}
            onClick={handleButtonClick}
            className="relative flex h-13 w-13 items-center justify-center rounded-full bg-[var(--color-brand-dark)] text-white shadow-[0_18px_50px_rgba(44,30,22,0.22)] transition hover:bg-[#4a3527] sm:h-16 sm:w-16"
            aria-label={t('frontend.customer_cart_panel.open_live_cart', 'Open live cart')}
            style={{ touchAction: 'none' }}
          >
            <ShoppingCart size={20} />
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#a42828] px-1 text-[9px] font-bold text-white sm:min-h-6 sm:min-w-6 sm:text-[10px]">
              {cart?.line_count || 0}
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
