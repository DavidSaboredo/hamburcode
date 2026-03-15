import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminSessionToken } from "@/lib/adminSession";

export async function POST(req: Request) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const password = process.env.ADMIN_PASSWORD;

  if (!secret || !password) {
    return NextResponse.json(
      { error: { message: "Admin no configurado" } },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json(
      { error: { message: "JSON inválido" } },
      { status: 400 }
    );
  }

  const input = (body.password ?? "").trim();

  const ok =
    input.length > 0 &&
    crypto.timingSafeEqual(
      Buffer.from(input, "utf8"),
      Buffer.from(password, "utf8")
    );

  if (!ok) {
    return NextResponse.json(
      { error: { message: "Credenciales inválidas" } },
      { status: 401 }
    );
  }

  const token = createAdminSessionToken({ secret, ttlSeconds: 60 * 60 * 24 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res;
}
