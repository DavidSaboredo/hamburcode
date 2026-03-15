export type MenuCategory = "classic" | "smash" | "pollo" | "veggie" | "extras";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  imageSrc: string;
  tags?: string[];
  stock: number;
  active: boolean;
};

export const categoryLabel: Record<MenuCategory, string> = {
  classic: "Clásicas",
  smash: "Smash",
  pollo: "Pollo",
  veggie: "Veggie",
  extras: "Extras",
};

export const menu: MenuItem[] = [
  {
    id: "classic-01",
    name: "La Doble Bacon",
    description: "Doble medallón, cheddar, bacon crocante y alioli.",
    price: 8500,
    category: "classic",
    imageSrc: "/hamb%20baccon.png",
    tags: ["Más vendida"],
    stock: 50,
    active: true,
  },
  {
    id: "smash-01",
    name: "Smash Onion",
    description: "Smash doble, cebolla planchada, cheddar y salsa house.",
    price: 7900,
    category: "smash",
    imageSrc: "/hamb%20onion.png",
    tags: ["Recomendada"],
    stock: 50,
    active: true,
  },
  {
    id: "pollo-01",
    name: "Chicken Crunch",
    description: "Pollo crispy, coleslaw, pepinillos y mayo spicy.",
    price: 7600,
    category: "pollo",
    imageSrc: "/hamb%20chicken.png",
    stock: 50,
    active: true,
  },
  {
    id: "veggie-01",
    name: "Veggie Deluxe",
    description: "Medallón veggie, cheddar, tomate, lechuga y alioli.",
    price: 7200,
    category: "veggie",
    imageSrc: "/hamb%20veggie.png",
    stock: 50,
    active: true,
  },
  {
    id: "extras-01",
    name: "Papas con cheddar y bacon",
    description: "Papas fritas con cheddar caliente y bacon crocante.",
    price: 5200,
    category: "extras",
    imageSrc: "/papas.png",
    tags: ["Nuevo"],
    stock: 50,
    active: true,
  },
];

export function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getMenuItemById(id: string) {
  return menu.find((m) => m.id === id);
}
