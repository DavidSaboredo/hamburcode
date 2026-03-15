"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { calculateShippingARS } from "@/lib/shipping";
import { formatARS, getMenuItemById } from "@/lib/menu";

// Checkout del cliente:
// - Lee carrito desde localStorage (persistencia entre páginas)
// - Valida datos en tiempo real
// - Envía pedido al backend (POST /api/orders)
type CartState = Record<string, number>;

type PaymentMethod = "efectivo" | "transferencia" | "mercadopago";

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  paymentMethod: PaymentMethod | "";
  notes: string;
  geo?: { lat: number; lng: number };
};

const CART_STORAGE_KEY = "hamburcode.cart.v1";
const PROFILE_STORAGE_KEY = "hamburcode.profile.v1";

function sanitizeQty(value: unknown) {
  if (typeof value !== "number") return 0;
  return Math.max(0, Math.floor(value));
}

function normalizeCart(value: unknown): CartState {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const out: CartState = {};
  for (const [key, rawQty] of Object.entries(record)) {
    const qty = sanitizeQty(rawQty);
    if (qty > 0) out[key] = qty;
  }
  return out;
}

function readCartFromStorage(): CartState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return {};
    return normalizeCart(JSON.parse(raw));
  } catch {
    return {};
  }
}

function validateCustomer(c: CustomerForm) {
  const errors: Partial<Record<keyof CustomerForm, string>> = {};

  if (!c.name.trim() || c.name.trim().length < 3) errors.name = "Ingresá tu nombre";
  if (c.phone.replaceAll(/\D/g, "").length < 8) errors.phone = "Teléfono inválido";
  if (!c.addressLine1.trim() || c.addressLine1.trim().length < 6)
    errors.addressLine1 = "Dirección incompleta";
  if (!c.paymentMethod) errors.paymentMethod = "Elegí un método de pago";

  if (c.email.trim().length > 0) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim());
    if (!ok) errors.email = "Email inválido";
  }

  return errors;
}

function getApiErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const error = (value as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return null;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : null;
}

function getOrderNumber(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const orderNumber = (value as Record<string, unknown>).orderNumber;
  return typeof orderNumber === "string" ? orderNumber : null;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartState>(() => readCartFromStorage());
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<{ orderNumber: string } | null>(null);

  const [customer, setCustomer] = useState<CustomerForm>({
    name: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    paymentMethod: "",
    notes: "",
  });

  const errors = useMemo(() => validateCustomer(customer), [customer]);
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  useEffect(() => {
    try {
      const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (rawProfile) {
        const p = JSON.parse(rawProfile) as Partial<CustomerForm>;
        setCustomer((prev) => ({
          ...prev,
          name: typeof p.name === "string" ? p.name : prev.name,
          phone: typeof p.phone === "string" ? p.phone : prev.phone,
          email: typeof p.email === "string" ? p.email : prev.email,
          addressLine1: typeof p.addressLine1 === "string" ? p.addressLine1 : prev.addressLine1,
          addressLine2: typeof p.addressLine2 === "string" ? p.addressLine2 : prev.addressLine2,
          city: typeof p.city === "string" ? p.city : prev.city,
          paymentMethod:
            p.paymentMethod === "efectivo" || p.paymentMethod === "transferencia" || p.paymentMethod === "mercadopago"
              ? p.paymentMethod
              : prev.paymentMethod,
        }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const lines = useMemo(() => {
    const out: { id: string; name: string; unitPrice: number; qty: number; lineTotal: number }[] = [];
    for (const [id, rawQty] of Object.entries(cart)) {
      const qty = sanitizeQty(rawQty);
      if (qty <= 0) continue;
      const item = getMenuItemById(id);
      if (!item) continue;
      out.push({
        id,
        name: item.name,
        unitPrice: item.price,
        qty,
        lineTotal: item.price * qty,
      });
    }
    return out;
  }, [cart]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.lineTotal, 0), [lines]);

  const shipping = useMemo(() => {
    const store = { lat: -34.6037, lng: -58.3816 };
    const customerGeo = customer.geo ? { lat: customer.geo.lat, lng: customer.geo.lng } : undefined;
    return calculateShippingARS({ store, customer: customerGeo });
  }, [customer.geo]);

  const total = subtotal + shipping;

  const setQty = (id: string, nextQty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const q = Math.max(0, Math.floor(nextQty));
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  };

  const clearCart = () => setCart({});

  const requestGeo = async () => {
    setServerError(null);
    if (!navigator.geolocation) {
      setServerError("Geolocalización no disponible en este dispositivo.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomer((prev) => ({
          ...prev,
          geo: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }));
      },
      () => setServerError("No se pudo obtener tu ubicación."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async () => {
    setServerError(null);

    if (lines.length === 0) {
      setServerError("Tu pedido está vacío.");
      return;
    }
    if (!isValid) {
      setServerError("Revisá los campos marcados.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cart,
          customer: {
            name: customer.name,
            phone: customer.phone,
            email: customer.email || undefined,
            addressLine1: customer.addressLine1,
            addressLine2: customer.addressLine2 || undefined,
            city: customer.city || undefined,
            paymentMethod: customer.paymentMethod,
            notes: customer.notes || undefined,
            geo: customer.geo,
          },
        }),
      });

      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setServerError(getApiErrorMessage(json) ?? "No se pudo enviar el pedido.");
        return;
      }

      const orderNumber = getOrderNumber(json);
      if (!orderNumber) {
        setServerError("Respuesta inválida del servidor.");
        return;
      }

      setCreatedOrder({ orderNumber });

      try {
        localStorage.setItem(
          PROFILE_STORAGE_KEY,
          JSON.stringify({
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            addressLine1: customer.addressLine1,
            addressLine2: customer.addressLine2,
            city: customer.city,
            paymentMethod: customer.paymentMethod,
          })
        );
      } catch {}

      clearCart();
    } catch {
      setServerError("Error de red. Intentá nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (createdOrder) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
          <div className="text-sm text-zinc-400">Pedido creado</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-white">
            {createdOrder.orderNumber}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
              href={`/order/${encodeURIComponent(createdOrder.orderNumber)}`}
            >
              Ver estado del pedido
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              href="/"
            >
              Volver al menú
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pt-10 pb-28">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          Volver
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Mi Pedido Detallado
              </h1>
              <div className="mt-1 text-sm text-zinc-400">
                Revisá cantidades, eliminá productos y confirmá el envío.
              </div>
            </div>
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Vaciar
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {lines.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-zinc-300">
                No hay productos en el pedido.
              </div>
            ) : (
              lines.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {l.name}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Unitario: {formatARS(l.unitPrice)} · Subtotal:{" "}
                      {formatARS(l.lineTotal)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty(l.id, l.qty - 1)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-base font-semibold leading-none text-white transition-colors hover:bg-white/10"
                    >
                      −
                    </button>
                    <div className="flex h-11 w-11 items-center justify-center text-sm font-semibold tabular-nums text-white">
                      {l.qty}
                    </div>
                    <button
                      type="button"
                      onClick={() => setQty(l.id, l.qty + 1)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-base font-semibold leading-none text-zinc-950 transition-colors hover:bg-zinc-200"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setQty(l.id, 0)}
                      className="ml-2 inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span>Subtotal</span>
              <span className="font-semibold text-white">{formatARS(subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-zinc-300">
              <span>Envío</span>
              <span className="font-semibold text-white">{formatARS(shipping)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-base">
              <span className="font-semibold text-white">Total</span>
              <span className="font-bold text-white">{formatARS(total)}</span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold tracking-tight text-white">Datos del cliente</h2>
          <div className="mt-1 text-sm text-zinc-400">
            Campos obligatorios marcados. Validación en tiempo real.
          </div>

          {serverError ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {serverError}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Nombre completo *</label>
              <input
                className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-white/20"
                value={customer.name}
                onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))}
              />
              {errors.name ? <div className="mt-1 text-xs text-red-200">{errors.name}</div> : null}
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Teléfono *</label>
              <input
                className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-white/20"
                value={customer.phone}
                onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))}
              />
              {errors.phone ? <div className="mt-1 text-xs text-red-200">{errors.phone}</div> : null}
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Email (opcional)</label>
              <input
                className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-white/20"
                value={customer.email}
                onChange={(e) => setCustomer((p) => ({ ...p, email: e.target.value }))}
              />
              {errors.email ? <div className="mt-1 text-xs text-red-200">{errors.email}</div> : null}
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Dirección completa *</label>
              <input
                className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-white/20"
                value={customer.addressLine1}
                onChange={(e) => setCustomer((p) => ({ ...p, addressLine1: e.target.value }))}
              />
              {errors.addressLine1 ? (
                <div className="mt-1 text-xs text-red-200">{errors.addressLine1}</div>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Piso/Depto (opcional)</label>
              <input
                className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-white/20"
                value={customer.addressLine2}
                onChange={(e) => setCustomer((p) => ({ ...p, addressLine2: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Ciudad / Barrio (opcional)</label>
              <input
                className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-white/20"
                value={customer.city}
                onChange={(e) => setCustomer((p) => ({ ...p, city: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Método de pago *</label>
              <select
                className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-white/20"
                value={customer.paymentMethod}
                onChange={(e) =>
                  setCustomer((p) => ({ ...p, paymentMethod: e.target.value as PaymentMethod | "" }))
                }
              >
                <option value="">Seleccionar…</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="mercadopago">Mercado Pago</option>
              </select>
              {errors.paymentMethod ? (
                <div className="mt-1 text-xs text-red-200">{errors.paymentMethod}</div>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Instrucciones (opcional)</label>
              <textarea
                className="mt-1 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                value={customer.notes}
                onChange={(e) => setCustomer((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={requestGeo}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Usar mi ubicación
              </button>
              <div className="text-xs text-zinc-400">
                {customer.geo ? "Ubicación cargada" : "Geolocalización opcional"}
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="inline-flex h-11 items-center justify-center rounded-full bg-amber-400 px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Enviar pedido"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
