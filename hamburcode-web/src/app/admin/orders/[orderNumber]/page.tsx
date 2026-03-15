import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/menu";
import OrderActions from "./OrderActions";
import { verifyAdminSessionToken } from "@/lib/adminSession";

export default async function AdminOrderPage(props: {
  params: Promise<{ orderNumber: string }>;
}) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  const ok = secret ? verifyAdminSessionToken({ secret, token }).ok : false;
  if (!ok) redirect("/admin/login");

  const { orderNumber } = await props.params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, events: { orderBy: { createdAt: "desc" } } },
  });

  if (!order) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-7 text-white">
          Pedido no encontrado.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Volver
          </Link>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm text-zinc-400">Pedido</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-white">
              {order.orderNumber}
            </div>
            <div className="mt-2 text-sm text-zinc-300">
              {order.customerName} · {order.customerPhone}
            </div>
            <div className="mt-1 text-sm text-zinc-300">
              {order.addressLine1}
              {order.addressLine2 ? `, ${order.addressLine2}` : ""}{" "}
              {order.city ? `(${order.city})` : ""}
            </div>
            <div className="mt-1 text-sm text-zinc-400">Pago: {order.paymentMethod}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-zinc-300">
              Total: <span className="font-semibold text-white">{formatARS(order.total)}</span>
            </div>
            <OrderActions
              orderNumber={order.orderNumber}
              current={order.status}
              customerName={order.customerName}
              customerPhone={order.customerPhone}
              paymentMethod={
                order.paymentMethod === "transferencia" ||
                order.paymentMethod === "mercadopago" ||
                order.paymentMethod === "efectivo"
                  ? order.paymentMethod
                  : "efectivo"
              }
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-semibold text-white">Resumen</div>
          <div className="mt-1 text-xs text-zinc-400">
            Copiá y pegá este texto si necesitás reenviar la info de pago por WhatsApp.
          </div>
          <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-200">
            {`Pedido: ${order.orderNumber}\nCliente: ${order.customerName}\nTel: ${order.customerPhone}\nPago: ${order.paymentMethod}\nTotal: ${formatARS(order.total)}\nDirección: ${order.addressLine1}${order.addressLine2 ? `, ${order.addressLine2}` : ""}${order.city ? ` (${order.city})` : ""}`}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {order.items.map(
            (i: { id: string; qty: number; name: string; lineTotal: number }) => (
            <div
              key={i.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            >
              <div className="min-w-0 truncate text-white">
                {i.qty}× {i.name}
              </div>
              <div className="shrink-0 font-semibold text-white">{formatARS(i.lineTotal)}</div>
            </div>
            )
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm">
          <div className="flex justify-between text-zinc-300">
            <span>Subtotal</span>
            <span className="font-semibold text-white">{formatARS(order.subtotal)}</span>
          </div>
          <div className="mt-2 flex justify-between text-zinc-300">
            <span>Envío</span>
            <span className="font-semibold text-white">{formatARS(order.shipping)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-white/10 pt-3">
            <span className="font-semibold text-white">Total</span>
            <span className="font-bold text-white">{formatARS(order.total)}</span>
          </div>
        </div>

        <div className="mt-6 text-xs text-zinc-400">
          Auditoría:
          <div className="mt-2 space-y-1">
            {order.events
              .slice(0, 10)
              .map((e: { id: string; createdAt: Date; type: string; message: string }) => (
              <div key={e.id}>
                {new Date(e.createdAt).toLocaleString("es-AR")} · {e.type} · {e.message}
              </div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
