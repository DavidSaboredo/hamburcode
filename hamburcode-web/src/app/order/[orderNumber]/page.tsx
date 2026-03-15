import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/menu";

export default async function OrderPage(props: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await props.params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, events: { orderBy: { createdAt: "desc" } } },
  });

  if (!order) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-7 text-white">
          Pedido no encontrado.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
        <div className="text-sm text-zinc-400">Pedido</div>
        <div className="mt-1 text-2xl font-bold tracking-tight text-white">
          {order.orderNumber}
        </div>
        <div className="mt-2 text-sm text-zinc-300">Estado: {order.status}</div>

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
              <div className="shrink-0 font-semibold text-white">
                {formatARS(i.lineTotal)}
              </div>
            </div>
            )
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm">
          <div className="flex justify-between text-zinc-300">
            <span>Subtotal</span>
            <span className="font-semibold text-white">
              {formatARS(order.subtotal)}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-zinc-300">
            <span>Envío</span>
            <span className="font-semibold text-white">
              {formatARS(order.shipping)}
            </span>
          </div>
          <div className="mt-3 flex justify-between border-t border-white/10 pt-3">
            <span className="font-semibold text-white">Total</span>
            <span className="font-bold text-white">{formatARS(order.total)}</span>
          </div>
        </div>

        <div className="mt-6 text-xs text-zinc-400">
          Últimos eventos:
          <div className="mt-2 space-y-1">
            {order.events
              .slice(0, 6)
              .map((e: { id: string; createdAt: Date; type: string }) => (
              <div key={e.id}>
                {new Date(e.createdAt).toLocaleString("es-AR")} · {e.type}
              </div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
