import React, { useEffect, useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ShoppingCart, X } from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function CustomerCartPanel() {
  const { auth, cart = { items: [], subtotal: 0, line_count: 0 } } = usePage().props;
  const wrapperRef = useRef(null);
  const dragRef = useRef({
    active: false,
    offsetX: 0,
    offsetY: 0,
  });
  const [position, setPosition] = useState({ x: null, y: null });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragRef.current.active || !wrapperRef.current) {
        return;
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
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    if (position.x === null || position.y === null) {
      setPosition({ x: rect.left, y: rect.top });
    }
  };

  return (
    <aside className="hidden xl:block">
      <div
        ref={wrapperRef}
        className="fixed z-30"
        style={{
          right: position.x === null ? '1.5rem' : 'auto',
          top: position.y === null ? '7rem' : `${position.y}px`,
          left: position.x === null ? 'auto' : `${position.x}px`,
        }}
      >
        {open && (
          <div className="absolute right-0 top-0 w-80 -translate-y-[calc(100%+12px)] rounded-[1.75rem] border border-[var(--color-sys-border)] bg-white/95 p-5 shadow-[0_18px_50px_rgba(44,30,22,0.12)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-sys-text-secondary)]">Your Cart</p>
                <h3 className="mt-2 text-xl font-black text-[var(--color-sys-text-primary)]">Cart details</h3>
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
                        Qty {item.quantity} • {item.unit}
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
                <span className="text-sm text-[var(--color-sys-text-secondary)]">Subtotal</span>
                <span className="text-lg font-black text-[var(--color-sys-text-primary)]">{formatCurrency(cart?.subtotal || 0)}</span>
              </div>
              <div className="mt-4 grid gap-3">
                <Link href="/cart" className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-sys-border)] px-4 py-3 text-sm font-semibold text-[var(--color-sys-text-primary)]">
                  Open cart
                </Link>
                <Link href="/checkout" className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] px-4 py-3 text-sm font-semibold text-white">
                  Confirm order
                </Link>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onPointerDown={startDragging}
          onClick={() => setOpen((current) => !current)}
          className="relative flex h-16 w-16 cursor-grab items-center justify-center rounded-full bg-[var(--color-brand-dark)] text-white shadow-[0_18px_50px_rgba(44,30,22,0.22)] select-none transition hover:bg-[#4a3527] active:cursor-grabbing"
          aria-label="Open live cart"
        >
          <ShoppingCart size={24} />
          <span className="absolute -right-1 -top-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[#a42828] px-1 text-[10px] font-bold text-white">
            {cart?.line_count || 0}
          </span>
        </button>
      </div>
    </aside>
  );
}
