import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyAdminSessionToken } from "@/lib/adminSession";
import OrdersList from "./OrdersList";

type PaymentMethod = "efectivo" | "transferencia" | "mercadopago";

function normalizePaymentMethod(value: string): PaymentMethod {
  if (value === "transferencia" || value === "mercadopago") return value;
  return "efectivo";
}

export default async function AdminPage() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  const ok = secret ? verifyAdminSessionToken({ secret, token }).ok : false;
  if (!ok) redirect("/admin/login");

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      orderNumber: true,
      createdAt: true,
      status: true,
      total: true,
      customerName: true,
      paymentMethod: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Pedidos</h1>
          <div className="mt-1 text-sm text-zinc-400">
            Listado y gestión de estados.
          </div>
        </div>
      </div>

      <OrdersList
        initialOrders={orders.map((o) => ({
          orderNumber: o.orderNumber,
          createdAt: o.createdAt.toISOString(),
          status: o.status,
          total: o.total,
          customerName: o.customerName,
          paymentMethod: normalizePaymentMethod(o.paymentMethod),
        }))}
      />
    </main>
  );
}
