import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/menu";
import { customerStatus, customerSteps } from "@/lib/orderStatus";
import AutoRefresh from "./AutoRefresh";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? "5493442462463";

function hora(date: Date) {
  return new Date(date).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default async function OrderPage(props: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await props.params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
  });

  if (!order) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
          <h1 className="text-xl font-bold text-white">No encontramos ese pedido</h1>
          <p className="mt-2 text-sm text-zinc-300">Revisá el link o volvé al menú para hacer uno nuevo.</p>
          <Link
            href="/"
            className="mt-5 inline-flex h-11 items-center rounded-full bg-amber-400 px-5 text-sm font-semibold text-black"
          >
            Ver el menú
          </Link>
        </div>
      </main>
    );
  }

  const info = customerStatus(order.status);
  const cerrado = info.step === -1 || info.step === customerSteps.length - 1;

  // Hora en que se llegó a cada paso, según el historial del pedido.
  const horaPorPaso: (string | null)[] = customerSteps.map(() => null);
  for (const e of order.events as { type: string; createdAt: Date; metadata: unknown }[]) {
    let paso = -1;
    if (e.type === "ORDER_CREATED") paso = 0;
    if (e.type === "STATUS_CHANGED") {
      const s = (e.metadata as { status?: unknown } | null)?.status;
      if (typeof s === "string") paso = customerStatus(s).step;
    }
    if (paso >= 0 && !horaPorPaso[paso]) horaPorPaso[paso] = hora(e.createdAt);
  }

  const consulta = encodeURIComponent(`Hola! Consulto por mi pedido ${order.orderNumber}`);

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <span aria-hidden>←</span> Volver al menú
      </Link>

      <section className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">
        <div className="text-sm text-zinc-400">Pedido {order.orderNumber}</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{info.title}</h1>
        <p className="mt-1.5 text-sm text-zinc-300">{info.text}</p>

        {info.step === -1 ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Este pedido no sigue en curso.
          </div>
        ) : (
          <ol className="mt-6">
            {customerSteps.map((label, i) => {
              const hecho = i < info.step || (i === info.step && cerrado);
              const actual = i === info.step && !cerrado;
              return (
                <li key={label} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < customerSteps.length - 1 && (
                    <span
                      aria-hidden
                      className={`absolute bottom-0 left-[9px] top-6 w-0.5 rounded-full ${i < info.step ? "bg-amber-400" : "bg-white/10"}`}
                    />
                  )}
                  <span
                    aria-hidden
                    className={`relative mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                      hecho ? "border-amber-400 bg-amber-400" : actual ? "border-amber-400" : "border-white/15"
                    }`}
                  >
                    {hecho && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3 text-black" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2.5 6.2 5 8.5l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {actual && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />}
                  </span>
                  <div className="flex flex-1 items-baseline justify-between gap-3">
                    <span className={`text-sm ${hecho || actual ? "font-semibold text-white" : "text-zinc-500"}`}>
                      {label}
                      {actual && <span className="sr-only"> (paso actual)</span>}
                    </span>
                    {horaPorPaso[i] && <span className="text-xs tabular-nums text-zinc-400">{horaPorPaso[i]}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">
        <h2 className="text-sm font-semibold text-white">Tu pedido</h2>
        <div className="mt-3 space-y-2">
          {order.items.map((i: { id: string; qty: number; name: string; lineTotal: number }) => (
            <div
              key={i.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            >
              <div className="min-w-0 truncate text-white">
                {i.qty}× {i.name}
              </div>
              <div className="shrink-0 font-semibold text-white">{formatARS(i.lineTotal)}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between text-zinc-300">
            <span>Subtotal</span>
            <span className="text-white">{formatARS(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-zinc-300">
            <span>Envío</span>
            <span className="text-white">{formatARS(order.shipping)}</span>
          </div>
          <div className="flex justify-between pt-1 text-base">
            <span className="font-semibold text-white">Total</span>
            <span className="font-bold text-white">{formatARS(order.total)}</span>
          </div>
        </div>
      </section>

      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${consulta}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
      >
        ¿Dudas con tu pedido? Escribinos por WhatsApp
      </a>

      {!cerrado && <AutoRefresh />}
    </main>
  );
}
