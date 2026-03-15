"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

// Lista de pedidos del admin:
// - Render inicial server-side, con refresco client-side por polling (cada 5s)
// - Notificación sonora cuando aparece un pedido nuevo
// - Color por estado + resumen de pago
type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

type PaymentMethod = "efectivo" | "transferencia" | "mercadopago";

type OrderSummary = {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  total: number;
  customerName: string;
  paymentMethod: PaymentMethod;
};

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusLabel(status: OrderStatus) {
  if (status === "PENDING") return "En espera";
  if (status === "CONFIRMED") return "Pedido recibido";
  if (status === "IN_PROGRESS") return "En preparación";
  if (status === "READY") return "En envío";
  if (status === "CANCELLED") return "Cancelado";
  if (status === "DELIVERED") return "Entregado";
  return status;
}

function statusClass(status: OrderStatus) {
  if (status === "PENDING") return "border-amber-500/30 bg-amber-500/5";
  if (status === "CONFIRMED") return "border-sky-500/30 bg-sky-500/5";
  if (status === "IN_PROGRESS") return "border-violet-500/30 bg-violet-500/5";
  if (status === "READY") return "border-emerald-500/30 bg-emerald-500/5";
  if (status === "CANCELLED") return "border-red-500/30 bg-red-500/10";
  return "border-white/10 bg-white/5";
}

function parseOrders(value: unknown): OrderSummary[] {
  if (!value || typeof value !== "object") return [];
  const root = value as Record<string, unknown>;
  const orders = root.orders;
  if (!Array.isArray(orders)) return [];

  const out: OrderSummary[] = [];
  for (const item of orders) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const orderNumber = typeof o.orderNumber === "string" ? o.orderNumber : null;
    const createdAt = typeof o.createdAt === "string" ? o.createdAt : null;
    const status = typeof o.status === "string" ? (o.status as OrderStatus) : null;
    const total = typeof o.total === "number" ? o.total : null;
    const customerName = typeof o.customerName === "string" ? o.customerName : null;
    const paymentMethod =
      o.paymentMethod === "efectivo" ||
      o.paymentMethod === "transferencia" ||
      o.paymentMethod === "mercadopago"
        ? (o.paymentMethod as PaymentMethod)
        : null;

    if (!orderNumber || !createdAt || !status || total === null || !customerName || !paymentMethod)
      continue;

    out.push({ orderNumber, createdAt, status, total, customerName, paymentMethod });
  }

  return out;
}

function playNotificationSound() {
  // Audio simple sin assets: oscillator (evita cargar archivos de sonido).
  // Nota: el navegador puede bloquear audio hasta que exista interacción del usuario.
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => {
      ctx.close().catch(() => null);
    };
  } catch {
    return;
  }
}

export default function OrdersList(props: { initialOrders: OrderSummary[] }) {
  const [orders, setOrders] = useState<OrderSummary[]>(props.initialOrders);
  const lastFirstOrderRef = useRef<string | null>(props.initialOrders[0]?.orderNumber ?? null);
  const firstPollDoneRef = useRef(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/orders", { cache: "no-store" });
        if (!res.ok) return;
        const json: unknown = await res.json().catch(() => null);
        const next = parseOrders(json);
        if (next.length === 0) return;

        const newest = next[0]?.orderNumber ?? null;
        const prev = lastFirstOrderRef.current;

        setOrders(next);

        if (firstPollDoneRef.current && newest && prev && newest !== prev) {
          playNotificationSound();
        }

        lastFirstOrderRef.current = newest;
        firstPollDoneRef.current = true;
      } catch {
        return;
      }
    };

    const id = window.setInterval(poll, 5000);
    poll().catch(() => null);
    return () => window.clearInterval(id);
  }, []);

  const rendered = useMemo(() => {
    return orders.map((o) => (
      <Link
        key={o.orderNumber}
        href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
        className={`rounded-2xl border p-4 transition-colors hover:bg-white/10 ${statusClass(o.status)}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{o.orderNumber}</div>
            <div className="mt-1 text-xs text-zinc-400">
              {new Date(o.createdAt).toLocaleString("es-AR")} · {o.customerName}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-zinc-300">{statusLabel(o.status)}</div>
            <div className="mt-1 text-xs text-zinc-400">
              Pago: {o.paymentMethod === "efectivo" ? "Efectivo" : o.paymentMethod === "transferencia" ? "Transferencia" : "Mercado Pago"}
              {o.status === "CONFIRMED" && o.paymentMethod !== "efectivo" ? " · esperando comprobante" : ""}
            </div>
            <div className="mt-1 text-sm font-semibold text-white">{formatARS(o.total)}</div>
          </div>
        </div>
      </Link>
    ));
  }, [orders]);

  return <div className="mt-6 grid gap-3">{rendered}</div>;
}
