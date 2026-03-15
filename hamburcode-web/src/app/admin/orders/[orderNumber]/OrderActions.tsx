"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Acciones de estado del pedido (admin).
// Los estados internos son enums simples; acá se exponen con labels más humanos.
type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

type PaymentMethod = "efectivo" | "transferencia" | "mercadopago";

type Action = {
  label: string;
  status: OrderStatus;
  kind?: "danger";
};

const actions: Action[] = [
  { label: "Pedido recibido", status: "CONFIRMED" },
  { label: "En preparación", status: "IN_PROGRESS" },
  { label: "En envío", status: "READY" },
  { label: "Cancelación", status: "CANCELLED", kind: "danger" },
];

function normalizeWhatsAppPhone(input: string) {
  const digits = input.replaceAll(/\D/g, "");
  return digits;
}

function buildWhatsAppLink(params: { phone: string; text: string }) {
  const phone = normalizeWhatsAppPhone(params.phone);
  const base = `https://wa.me/${phone}`;
  const query = new URLSearchParams({ text: params.text });
  return `${base}?${query.toString()}`;
}

function buildReceiptText(params: {
  orderNumber: string;
  customerName: string;
  paymentMethod: PaymentMethod;
}) {
  const name = params.customerName.trim();
  const header = `Hola${name ? ` ${name}` : ""}! Recibimos tu pedido ${params.orderNumber}.`;

  if (params.paymentMethod === "transferencia") {
    return `${header}\n\nPago: transferencia.\nCuando lo tengas, enviá el comprobante por acá.\n\nEn cuanto se acredite, comenzamos la preparación.`;
  }

  if (params.paymentMethod === "mercadopago") {
    return `${header}\n\nPago: Mercado Pago.\nCuando lo tengas, enviá el comprobante por acá.\n\nEn cuanto se acredite, comenzamos la preparación.`;
  }

  return `${header}\n\nYa lo pasamos a preparación. Te avisamos cuando salga para envío.`;
}

export default function OrderActions(props: {
  orderNumber: string;
  current: OrderStatus;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const setStatus = async (status: OrderStatus) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(props.orderNumber)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;

      if (status === "CONFIRMED") {
        // Al confirmar recepción, se abre WhatsApp al cliente con un texto prearmado
        // (ej: "esperando comprobante" si el pago es transferencia/MP).
        const text = buildReceiptText({
          orderNumber: props.orderNumber,
          customerName: props.customerName,
          paymentMethod: props.paymentMethod,
        });
        const href = buildWhatsAppLink({ phone: props.customerPhone, text });
        window.open(href, "_blank", "noopener,noreferrer");
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a.status}
          type="button"
          disabled={loading}
          onClick={() => setStatus(a.status)}
          className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors ${
            a.status === props.current
              ? a.kind === "danger"
                ? "bg-red-500 text-white"
                : "bg-white text-zinc-950"
              : a.kind === "danger"
                ? "border border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/15"
                : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
