// Textos de los estados del pedido: una sola fuente para el panel del local y la página del cliente.

export function statusLabel(status: string) {
  if (status === "PENDING") return "En espera";
  if (status === "CONFIRMED") return "Pedido recibido";
  if (status === "IN_PROGRESS") return "En preparación";
  if (status === "READY") return "En envío";
  if (status === "CANCELLED") return "Cancelado";
  if (status === "REJECTED") return "Rechazado";
  if (status === "DELIVERED") return "Entregado";
  return status;
}

// Pasos que ve el cliente, en orden.
export const customerSteps = ["Enviado", "Confirmado", "En la cocina", "En camino", "Entregado"];

export function customerStatus(status: string) {
  if (status === "CONFIRMED")
    return { step: 1, title: "Pedido confirmado", text: "El local ya lo vio y entra a la cocina en breve." };
  if (status === "IN_PROGRESS")
    return { step: 2, title: "Estamos preparando tu pedido", text: "Ya está en la cocina." };
  if (status === "READY")
    return { step: 3, title: "Tu pedido va en camino", text: "Salió del local. Tené el teléfono a mano." };
  if (status === "DELIVERED")
    return { step: 4, title: "Pedido entregado", text: "¡Que lo disfrutes!" };
  if (status === "CANCELLED" || status === "REJECTED")
    return { step: -1, title: "Pedido cancelado", text: "Si tenés alguna duda, escribinos por WhatsApp." };
  return { step: 0, title: "Recibimos tu pedido", text: "El local lo tiene que confirmar. Esta página se actualiza sola." };
}

type OrderEvent = { type: string; metadata: unknown };

function eventStatus(e: OrderEvent) {
  const m = e.metadata as { status?: unknown } | null;
  return typeof m?.status === "string" ? m.status : null;
}

export function eventLabel(e: OrderEvent, audience: "cliente" | "local") {
  if (e.type === "ORDER_CREATED") return audience === "cliente" ? "Pedido enviado" : "Pedido creado";
  if (e.type === "STATUS_CHANGED") {
    const s = eventStatus(e);
    if (!s) return "Cambio de estado";
    return audience === "cliente" ? customerStatus(s).title : `Pasó a "${statusLabel(s)}"`;
  }
  return "Actualización";
}
