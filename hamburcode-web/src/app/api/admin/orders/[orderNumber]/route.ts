import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAdminSessionToken } from "@/lib/adminSession";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ orderNumber: string }> }
) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  const ok = secret ? verifyAdminSessionToken({ secret, token }).ok : false;
  if (!ok) {
    return NextResponse.json({ error: { message: "No autorizado" } }, { status: 401 });
  }

  const { orderNumber } = await ctx.params;

  let body: { status?: OrderStatus };
  try {
    body = (await req.json()) as { status?: OrderStatus };
  } catch {
    return NextResponse.json(
      { error: { message: "JSON inválido" } },
      { status: 400 }
    );
  }

  const status = body.status;
  if (!status) {
    return NextResponse.json({ error: { message: "Falta status" } }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { orderNumber },
    data: {
      status,
      events: {
        create: {
          type: "STATUS_CHANGED",
          message: `Estado cambiado a ${status}`,
          metadata: { status },
        },
      },
    },
    select: { orderNumber: true, status: true },
  });

  return NextResponse.json(updated);
}
