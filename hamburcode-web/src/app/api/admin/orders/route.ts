import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAdminSessionToken } from "@/lib/adminSession";

export async function GET() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  const ok = secret ? verifyAdminSessionToken({ secret, token }).ok : false;
  if (!ok) {
    return NextResponse.json({ error: { message: "No autorizado" } }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      orderNumber: true,
      createdAt: true,
      status: true,
      total: true,
      customerName: true,
      customerPhone: true,
      paymentMethod: true,
    },
    take: 200,
  });

  return NextResponse.json({ orders });
}
