"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { statusLabel } from "@/lib/orderStatus";

// Lista de pedidos del admin:
// - Render inicial server-side, con refresco client-side por polling (cada 5s)
// - Aviso sonoro cuando aparece un pedido nuevo (hay que activarlo con un toque)
// - Avisos si se corta la conexión o vence la sesión
// - Pantalla encendida mientras el panel está abierto
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

type Conexion = "ok" | "sin-conexion" | "sesion-vencida";

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusClass(status: OrderStatus) {
  if (status === "PENDING") return "border-amber-500/30 bg-amber-500/5";
  if (status === "CONFIRMED") return "border-sky-500/30 bg-sky-500/5";
  if (status === "IN_PROGRESS") return "border-violet-500/30 bg-violet-500/5";
  if (status === "READY") return "border-emerald-500/30 bg-emerald-500/5";
  if (status === "CANCELLED") return "border-red-500/30 bg-red-500/10";
  return "border-white/10 bg-white/5";
}

function parseOrders(value: unknown): OrderSummary[] | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  const orders = root.orders;
  if (!Array.isArray(orders)) return null;

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

// Un solo AudioContext para todo el panel. El navegador lo deja sonar recién
// después de un toque o una tecla en la página (el login recarga la página,
// así que ese toque hay que pedirlo acá). Queda vivo al ir y volver de un pedido.
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    audioCtx = new AudioCtx();
  }
  return audioCtx;
}

function playNotificationSound() {
  // Campanita de tres notas, dos veces: se distingue del ruido de la cocina.
  // Sin archivos de sonido: se arma con osciladores.
  const ctx = audioCtx;
  if (!ctx || ctx.state !== "running") return;
  const notas = [660, 880, 1320];
  const t0 = ctx.currentTime + 0.02;
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    notas.forEach((freq, i) => {
      const start = t0 + vuelta * 0.75 + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  }
}

export default function OrdersList(props: { initialOrders: OrderSummary[] }) {
  const [orders, setOrders] = useState<OrderSummary[]>(props.initialOrders);
  // Pedidos ya vistos: suena solo por los que no estaban (también el primero del día).
  const conocidosRef = useRef<Set<string>>(new Set(props.initialOrders.map((o) => o.orderNumber)));
  const [nuevos, setNuevos] = useState<Set<string>>(() => new Set());
  const [sonidoActivo, setSonidoActivo] = useState(false);
  const [conexion, setConexion] = useState<Conexion>("ok");
  const fallosRef = useRef(0);
  const sinVerRef = useRef(0);

  // Sonido: se activa con el botón o con cualquier toque/tecla en la página.
  useEffect(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const sincronizar = () => setSonidoActivo(ctx.state === "running");
    const activar = () => {
      if (ctx.state !== "running") ctx.resume().then(sincronizar).catch(() => null);
    };
    sincronizar();
    ctx.addEventListener("statechange", sincronizar);
    window.addEventListener("click", activar);
    window.addEventListener("touchend", activar);
    window.addEventListener("keydown", activar);
    return () => {
      ctx.removeEventListener("statechange", sincronizar);
      window.removeEventListener("click", activar);
      window.removeEventListener("touchend", activar);
      window.removeEventListener("keydown", activar);
    };
  }, []);

  // Pantalla encendida mientras el panel está abierto: si el celu o la tablet
  // se bloquean, la página se duerme y deja de buscar pedidos.
  useEffect(() => {
    type WakeLock = { release: () => Promise<void> };
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLock> };
    };
    if (!nav.wakeLock) return;
    let lock: WakeLock | null = null;
    const pedir = () => {
      if (document.visibilityState !== "visible") return;
      nav.wakeLock
        ?.request("screen")
        .then((l) => {
          lock = l;
        })
        .catch(() => null);
    };
    pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      document.removeEventListener("visibilitychange", pedir);
      lock?.release().catch(() => null);
    };
  }, []);

  // Pestaña en segundo plano: el título cuenta los pedidos nuevos sin ver.
  useEffect(() => {
    const tituloOriginal = document.title;
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      sinVerRef.current = 0;
      document.title = tituloOriginal;
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      document.title = tituloOriginal;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/admin/orders", { cache: "no-store" });
        if (res.status === 401) {
          if (!cancelado) setConexion("sesion-vencida");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = parseOrders(await res.json());
        if (!next) throw new Error("Respuesta inválida");
        if (cancelado) return;

        fallosRef.current = 0;
        setConexion("ok");
        setOrders(next);

        const llegaron = next
          .map((o) => o.orderNumber)
          .filter((n) => !conocidosRef.current.has(n));
        if (llegaron.length === 0) return;

        llegaron.forEach((n) => conocidosRef.current.add(n));
        setNuevos((prev) => new Set([...prev, ...llegaron]));
        playNotificationSound();
        if (document.visibilityState !== "visible") {
          sinVerRef.current += llegaron.length;
          document.title = `(${sinVerRef.current}) Pedido nuevo · HamburCode`;
        }
      } catch {
        fallosRef.current += 1;
        if (!cancelado && fallosRef.current >= 2) setConexion("sin-conexion");
      }
    };

    const id = window.setInterval(poll, 5000);
    poll().catch(() => null);
    return () => {
      cancelado = true;
      window.clearInterval(id);
    };
  }, []);

  const activarSonido = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    ctx
      .resume()
      .then(() => {
        setSonidoActivo(ctx.state === "running");
        playNotificationSound();
      })
      .catch(() => null);
  };

  const rendered = useMemo(() => {
    return orders.map((o) => {
      const esNuevo = nuevos.has(o.orderNumber);
      return (
        <Link
          key={o.orderNumber}
          href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
          className={`rounded-2xl border p-4 transition-colors hover:bg-white/10 ${statusClass(o.status)}${esNuevo ? " ring-2 ring-amber-400" : ""}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-white">{o.orderNumber}</span>
                {esNuevo ? (
                  <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-zinc-950">
                    Nuevo
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                {new Date(o.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} · {o.customerName}
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
      );
    });
  }, [orders, nuevos]);

  return (
    <>
      <div className="mt-6 grid gap-3" aria-live="polite">
        {conexion === "sesion-vencida" ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            Se cerró la sesión del panel. Hasta que vuelvas a ingresar no aparecen ni suenan los pedidos nuevos.{" "}
            <a href="/admin/login" className="font-semibold text-white underline underline-offset-4">
              Volver a ingresar
            </a>
          </div>
        ) : null}

        {conexion === "sin-conexion" ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Sin conexión. Sigo intentando cada 5 segundos; los pedidos nuevos aparecen cuando vuelva.
          </div>
        ) : null}

        {sonidoActivo ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
            <span>Aviso sonoro activado: suena cuando entra un pedido.</span>
            <button
              type="button"
              onClick={playNotificationSound}
              className="inline-flex h-9 items-center rounded-full border border-white/15 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              Probar sonido
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <span>
              <strong className="font-semibold text-white">El aviso sonoro está apagado.</strong> El navegador
              pide un toque para habilitarlo cada vez que se abre el panel.
            </span>
            <button
              type="button"
              onClick={activarSonido}
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
            >
              Activar sonido
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-3">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-400">
            Todavía no hay pedidos. Cuando entre uno, aparece acá y suena el aviso.
          </div>
        ) : (
          rendered
        )}
      </div>
    </>
  );
}
