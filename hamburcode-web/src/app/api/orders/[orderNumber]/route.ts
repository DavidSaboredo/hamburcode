import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pedido no encontrado" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    addressLine1: order.addressLine1,
    addressLine2: order.addressLine2,
    city: order.city,
    notes: order.notes,
    paymentMethod: order.paymentMethod,
    items: order.items,
    events: order.events,
  });
}
