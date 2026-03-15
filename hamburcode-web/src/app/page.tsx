"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MenuCategory = "classic" | "smash" | "pollo" | "veggie" | "extras";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  imageSrc: string;
  tags?: string[];
};

const WHATSAPP_NUMBER = "5491100000000";
const LOGO_SRC = "/logo%20empresa.png";

const menu: MenuItem[] = [
  {
    id: "classic-01",
    name: "La Doble Bacon",
    description: "Doble medallón, cheddar, bacon crocante y alioli.",
    price: 8500,
    category: "classic",
    imageSrc: "/hamb%20baccon.png",
    tags: ["Más vendida"],
  },
  {
    id: "smash-01",
    name: "Smash Onion",
    description: "Smash doble, cebolla planchada, cheddar y salsa house.",
    price: 7900,
    category: "smash",
    imageSrc: "/hamb%20onion.png",
    tags: ["Recomendada"],
  },
  {
    id: "pollo-01",
    name: "Chicken Crunch",
    description: "Pollo crispy, coleslaw, pepinillos y mayo spicy.",
    price: 7600,
    category: "pollo",
    imageSrc: "/hamb%20chicken.png",
  },
  {
    id: "veggie-01",
    name: "Veggie Deluxe",
    description: "Medallón veggie, cheddar, tomate, lechuga y alioli.",
    price: 7200,
    category: "veggie",
    imageSrc: "/hamb%20veggie.png",
  },
  {
    id: "extras-01",
    name: "Papas con cheddar y bacon",
    description: "Papas fritas con cheddar caliente y bacon crocante.",
    price: 5200,
    category: "extras",
    imageSrc: "/papas.png",
    tags: ["Nuevo"],
  },
];

const categoryLabel: Record<MenuCategory, string> = {
  classic: "Clásicas",
  smash: "Smash",
  pollo: "Pollo",
  veggie: "Veggie",
  extras: "Extras",
};

const formatARS = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);

function buildWhatsAppLink(params: {
  phone: string;
  text: string;
}): string {
  const base = `https://wa.me/${params.phone}`;
  const query = new URLSearchParams({ text: params.text });
  return `${base}?${query.toString()}`;
}

type CartState = Record<string, number>;
const CART_STORAGE_KEY = "hamburcode.cart.v1";

function normalizeCart(value: unknown): CartState {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const out: CartState = {};
  for (const [key, rawQty] of Object.entries(record)) {
    if (typeof rawQty !== "number") continue;
    const qty = Math.max(0, Math.floor(rawQty));
    if (qty > 0) out[key] = qty;
  }
  return out;
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<
    MenuCategory | "all"
  >("all");
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartState>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return {};
      return normalizeCart(JSON.parse(raw));
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      return;
    }
  }, [cart]);

  const persistCart = (next: CartState) => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    } catch {
      return;
    }
  };

  const addToCart = (itemId: string) => {
    setCart((prev) => {
      const next = { ...prev, [itemId]: (prev[itemId] ?? 0) + 1 };
      persistCart(next);
      return next;
    });
  };

  const removeOneFromCart = (itemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      const current = (next[itemId] ?? 0) - 1;
      if (current <= 0) delete next[itemId];
      else next[itemId] = current;
      persistCart(next);
      return next;
    });
  };

  const clearCart = () => {
    setCart({});
    persistCart({});
  };

  const cartLines = useMemo(() => {
    const lines: { item: MenuItem; qty: number; lineTotal: number }[] = [];
    for (const [id, rawQty] of Object.entries(cart)) {
      const item = menu.find((m) => m.id === id);
      if (!item) continue;
      const qty = Math.max(0, Math.floor(rawQty));
      if (qty <= 0) continue;
      lines.push({ item, qty, lineTotal: item.price * qty });
    }
    return lines;
  }, [cart]);

  const cartCount = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.qty, 0),
    [cartLines]
  );

  const cartTotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.lineTotal, 0),
    [cartLines]
  );

  const categories = useMemo(
    () =>
      (Object.keys(categoryLabel) as MenuCategory[]).filter((c) =>
        menu.some((m) => m.category === c)
      ),
    []
  );

  const filteredMenu = useMemo(() => {
    if (selectedCategory === "all") return menu;
    return menu.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const openItem = useMemo(
    () => (openItemId ? menu.find((m) => m.id === openItemId) : undefined),
    [openItemId]
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5 md:h-16 md:w-16">
              <Image
                src={LOGO_SRC}
                alt="Logo"
                fill
                sizes="(min-width: 768px) 64px, 56px"
                className="object-contain scale-150"
                priority
              />
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold tracking-tight">
                HamburCode
              </div>
              <div className="text-xs text-zinc-400">
                Hamburguesas • Smash • Papas
              </div>
            </div>
          </div>

          <Link
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
            href={cartCount > 0 ? "/checkout" : "#menu"}
          >
            {cartCount > 0 ? `Mi pedido · ${cartCount}` : "Ver menú"}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pt-10 pb-28">
        <section className="grid gap-6 rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-7 md:grid-cols-[1.2fr_0.8fr] md:gap-10 md:p-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Delivery y take away
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              Hamburguesas que se ven y se sienten
            </h1>
            <p className="max-w-xl text-base leading-7 text-zinc-300">
              Elegí tu burger, mirá ingredientes claros y pedí al toque por
              WhatsApp. Diseño oscuro, directo y con foco en el producto.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                className="inline-flex h-11 items-center justify-center rounded-full bg-amber-400 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
                href="#menu"
              >
                Ver menú
              </a>
              <a
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                href={buildWhatsAppLink({
                  phone: WHATSAPP_NUMBER,
                  text: "Hola! Quiero hacer un pedido. ¿Qué recomiendan hoy?",
                })}
                target="_blank"
                rel="noopener noreferrer"
              >
                Recomendación
              </a>
            </div>
            <div className="text-xs text-zinc-400">
              Cambiá el número en WHATSAPP_NUMBER (page.tsx).
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(251,191,36,0.35),transparent_45%),radial-gradient(circle_at_70%_60%,rgba(220,38,38,0.35),transparent_55%)]" />
            <div className="relative flex h-full min-h-56 flex-col justify-end gap-3 p-6">
              <div className="text-sm font-semibold text-zinc-200">
                Destacadas
              </div>
              <div className="grid gap-2">
                {menu
                  .filter((m) => (m.tags ?? []).length > 0)
                  .slice(0, 3)
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setOpenItemId(m.id)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {m.name}
                        </div>
                        <div className="truncate text-xs text-zinc-400">
                          {(m.tags ?? []).join(" • ")}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-950">
                        {formatARS(m.price)}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </section>

        <section id="menu" className="mt-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Menú</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Nombres claros, ingredientes directos, precio visible.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`h-10 rounded-full px-4 text-sm font-semibold transition-colors ${
                  selectedCategory === "all"
                    ? "bg-white text-zinc-950"
                    : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Todo
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`h-10 rounded-full px-4 text-sm font-semibold transition-colors ${
                    selectedCategory === category
                      ? "bg-white text-zinc-950"
                      : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {categoryLabel[category]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMenu.map((item) => {
              const tags = item.tags ?? [];

              return (
                <article
                  key={item.id}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
                >
                  <div className="relative h-36 bg-zinc-900">
                    <Image
                      src={item.imageSrc}
                      alt={item.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold tracking-tight">
                          {item.name}
                        </h3>
                        <div className="mt-1 text-sm text-zinc-400">
                          {categoryLabel[item.category]}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-zinc-950">
                        {formatARS(item.price)}
                      </div>
                    </div>

                    <div className="flex min-h-7 flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-zinc-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className="min-h-[48px] max-h-[48px] overflow-hidden text-sm leading-6 text-zinc-300">
                      {item.description}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setOpenItemId(item.id)}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold leading-none text-white transition-colors hover:bg-white/10"
                      >
                        Ver detalle
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => removeOneFromCart(item.id)}
                          disabled={(cart[item.id] ?? 0) === 0}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-base font-semibold leading-none text-white transition-colors hover:bg-white/10 disabled:opacity-40"
                        >
                          −
                        </button>
                        <div className="flex h-11 w-11 items-center justify-center text-sm font-semibold tabular-nums text-white">
                          {cart[item.id] ?? 0}
                        </div>
                        <button
                          type="button"
                          onClick={() => addToCart(item.id)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-base font-semibold leading-none text-zinc-950 transition-colors hover:bg-zinc-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="mt-14 border-t border-white/10 pt-8 text-sm text-zinc-400">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-zinc-200">HamburCode</div>
              <div>Delivery • Take away • Horarios a definir</div>
            </div>
            <a
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              href={buildWhatsAppLink({
                phone: WHATSAPP_NUMBER,
                text: "Hola! ¿Cuál es el horario y zona de delivery?",
              })}
              target="_blank"
              rel="noopener noreferrer"
            >
              Consultar por WhatsApp
            </a>
          </div>

          <div className="mt-6 text-xs text-zinc-500">
            Copyright © 2026 Laruzo. Todos los derechos reservados. Diseñado y desarrollado por Laruzo.
          </div>
        </footer>
      </main>

      {cartCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {cartCount === 1 ? "1 ítem en el carrito" : `${cartCount} ítems en el carrito`}
              </div>
              <div className="text-xs text-zinc-400">Total: {formatARS(cartTotal)}</div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                href="/checkout"
              >
                Mi pedido
              </Link>
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Vaciar
              </button>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full bg-amber-400 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
                href="/checkout"
              >
                Continuar
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {openItem ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenItemId(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-44 bg-zinc-900">
              <Image
                src={openItem.imageSrc}
                alt={openItem.name}
                fill
                sizes="(min-width: 640px) 512px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            </div>
            <div className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-zinc-400">
                    {categoryLabel[openItem.category]}
                  </div>
                  <h3 className="truncate text-xl font-bold tracking-tight">
                    {openItem.name}
                  </h3>
                </div>
                <div className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-zinc-950">
                  {formatARS(openItem.price)}
                </div>
              </div>

              {openItem.tags && openItem.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {openItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <p className="text-sm leading-6 text-zinc-300">
                {openItem.description}
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setOpenItemId(null)}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => addToCart(openItem.id)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-amber-400 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
                >
                  Agregar al carrito
                </button>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  href="/checkout"
                >
                  Ir a mi pedido
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
