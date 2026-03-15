import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateShippingARS } from "@/lib/shipping";
import { formatARS, menu } from "@/lib/menu";
import { notifyBusiness } from "@/lib/notifyBusiness";
import { sendOrderEmail } from "@/lib/email";

// Endpoint principal de creación de pedidos.
// - Valida datos del cliente y carrito
// - Calcula envío (por geolocalización opcional)
// - Verifica stock y descuenta inventario en una transacción
// - Genera número de orden único + auditoría
// - Dispara notificaciones opcionales (webhook / email)
type CreateOrderBody = {
  cart: Record<string, number>;
  customer: {
    name: string;
    phone: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    city?: string;
    paymentMethod: "efectivo" | "transferencia" | "mercadopago";
    notes?: string;
    geo?: { lat: number; lng: number };
  };
};

function sanitizeQty(value: unknown) {
  if (typeof value !== "number") return 0;
  return Math.max(0, Math.floor(value));
}

// Formato: HC-YYYYMMDD-RAND (sufijo aleatorio de 4 dígitos).
function makeOrderNumber() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replaceAll("-", "");
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `HC-${ymd}-${rnd}`;
}

async function ensureProductsSeeded() {
  // El catálogo vive en el frontend, pero se sincroniza a DB para stock/validación.
  for (const item of menu) {
    await prisma.product.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        imageSrc: item.imageSrc,
        price: item.price,
        active: item.active,
        stock: item.stock,
      },
      update: {
        name: item.name,
        description: item.description,
        category: item.category,
        imageSrc: item.imageSrc,
        price: item.price,
        active: item.active,
      },
    });
  }
}

export async function POST(req: Request) {
  let body: CreateOrderBody;
  try {
    body = (await req.json()) as CreateOrderBody;
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_JSON", message: "JSON inválido" } },
      { status: 400 }
    );
  }

  const name = body.customer?.name?.trim();
  const phone = body.customer?.phone?.trim();
  const addressLine1 = body.customer?.addressLine1?.trim();
  const paymentMethod = body.customer?.paymentMethod;

  if (!name || name.length < 3) {
    return NextResponse.json(
      {
        error: { code: "VALIDATION", field: "name", message: "Nombre inválido" },
      },
      { status: 400 }
    );
  }
  if (!phone || phone.replaceAll(/\D/g, "").length < 8) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          field: "phone",
          message: "Teléfono inválido",
        },
      },
      { status: 400 }
    );
  }
  if (!addressLine1 || addressLine1.length < 6) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          field: "addressLine1",
          message: "Dirección inválida",
        },
      },
      { status: 400 }
    );
  }
  if (!paymentMethod) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          field: "paymentMethod",
          message: "Elegí método de pago",
        },
      },
      { status: 400 }
    );
  }

  const cart = body.cart ?? {};
  const requested = Object.entries(cart)
    .map(([id, qty]) => ({ id, qty: sanitizeQty(qty) }))
    .filter((x) => x.qty > 0);

  if (requested.length === 0) {
    return NextResponse.json(
      { error: { code: "EMPTY_CART", message: "El carrito está vacío" } },
      { status: 400 }
    );
  }

  await ensureProductsSeeded();

  const store = {
    lat: process.env.STORE_LAT ? Number(process.env.STORE_LAT) : -34.6037,
    lng: process.env.STORE_LNG ? Number(process.env.STORE_LNG) : -58.3816,
  };

  const customerGeo = body.customer.geo
    ? { lat: Number(body.customer.geo.lat), lng: Number(body.customer.geo.lng) }
    : undefined;

  const shipping = calculateShippingARS({ store, customer: customerGeo });

  try {
    const created = await prisma.$transaction(async (tx) => {
      // 1) Traer productos activos (para validar existencia/stock)
      const products = await tx.product.findMany({
        where: { id: { in: requested.map((r) => r.id) }, active: true },
      });

      const byId = new Map(products.map((p) => [p.id, p]));
      const missing = requested.filter((r) => !byId.has(r.id));
      if (missing.length) throw new Error("PRODUCT_NOT_FOUND");

      // 2) Validación de stock
      const outOfStock = requested
        .map((r) => {
          const p = byId.get(r.id)!;
          return { id: r.id, name: p.name, requested: r.qty, stock: p.stock };
        })
        .filter((x) => x.requested > x.stock);

      if (outOfStock.length) {
        return { kind: "OUT_OF_STOCK" as const, outOfStock };
      }

      // 3) Descontar stock
      for (const r of requested) {
        await tx.product.update({
          where: { id: r.id },
          data: { stock: { decrement: r.qty } },
        });
      }

      // 4) Construir items con totales
      const lines = requested.map((r) => {
        const p = byId.get(r.id)!;
        const unitPrice = p.price;
        const lineTotal = unitPrice * r.qty;
        return {
          productId: p.id,
          name: p.name,
          unitPrice,
          qty: r.qty,
          lineTotal,
        };
      });

      const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
      const total = subtotal + shipping;

      // 5) Garantizar un orderNumber único (reintentos)
      let orderNumber = "";
      for (let i = 0; i < 5; i++) {
        const candidate = makeOrderNumber();
        const exists = await tx.order.findUnique({
          where: { orderNumber: candidate },
        });
        if (!exists) {
          orderNumber = candidate;
          break;
        }
      }
      if (!orderNumber) throw new Error("ORDER_NUMBER");

      const order = await tx.order.create({
        data: {
          orderNumber,
          subtotal,
          shipping,
          total,
          customerName: name,
          customerPhone: phone,
          addressLine1,
          addressLine2: body.customer.addressLine2?.trim() || null,
          city: body.customer.city?.trim() || null,
          notes: body.customer.notes?.trim() || null,
          paymentMethod,
          lat: customerGeo?.lat ?? null,
          lng: customerGeo?.lng ?? null,
          items: { create: lines },
          events: {
            create: {
              type: "ORDER_CREATED",
              message: "Orden creada",
              metadata: { paymentMethod, shipping },
            },
          },
        },
        include: { items: true },
      });

      return { kind: "OK" as const, order };
    });

    if (created.kind === "OUT_OF_STOCK") {
      return NextResponse.json(
        {
          error: {
            code: "OUT_OF_STOCK",
            message: "Sin stock para algunos productos",
            details: created.outOfStock,
          },
        },
        { status: 409 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const adminUrl = `${baseUrl}/admin/orders/${encodeURIComponent(
      created.order.orderNumber
    )}`;

    // Notificación a sistema del negocio (opcional; firmada con HMAC)
    await notifyBusiness({
      orderNumber: created.order.orderNumber,
      customerName: created.order.customerName,
      customerPhone: created.order.customerPhone,
      total: created.order.total,
      addressLine1: created.order.addressLine1,
      addressLine2: created.order.addressLine2,
      city: created.order.city,
      urlToAdminOrder: adminUrl,
    });

    // Email al cliente (opcional; requiere SMTP configurado)
    if (body.customer.email?.trim()) {
      const text =
        `Orden ${created.order.orderNumber}\n` +
        `Estado: ${created.order.status}\n` +
        `Total: ${formatARS(created.order.total)}\n`;

      await sendOrderEmail({
        to: body.customer.email.trim(),
        subject: `Confirmación de pedido ${created.order.orderNumber}`,
        text,
      });
    }

    return NextResponse.json({
      orderNumber: created.order.orderNumber,
      status: created.order.status,
      total: created.order.total,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    const code =
      message === "PRODUCT_NOT_FOUND"
        ? "PRODUCT_NOT_FOUND"
        : message === "ORDER_NUMBER"
          ? "ORDER_NUMBER"
          : "INTERNAL";

    return NextResponse.json(
      { error: { code, message: "No se pudo crear el pedido" } },
      { status: 500 }
    );
  }
}
