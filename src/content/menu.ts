/**
 * The fictional restaurant's menu. Each product carries a small model spec that the 3D product
 * renderer builds from the same ingredient system as the landing-page story.
 */

export type StackPart =
  | "bottomBun"
  | "patty"
  | "cheese"
  | "lettuce"
  | "tomato"
  | "onion"
  | "pickles"
  | "chicken"
  | "slaw"
  | "topBun"
  | "topBunPotato";

export type ProductModel =
  | { kind: "burger"; stack: StackPart[] }
  | { kind: "fries" }
  | { kind: "loadedFries" }
  | { kind: "onionRings" }
  | { kind: "cup"; drink: "cola" | "lemonade" }
  | { kind: "shake"; flavor: "strawberry" | "caramel" };

/** What happens when you hover or tap a product. */
export type Interaction = "explode" | "jostle" | "topple" | "stir" | "wobble";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: string;
  model: ProductModel;
  interaction: Interaction;
  /** Hint shown under the product ("Hover to take it apart"). */
  hint: string;
  /** Labels for the exploded view of burgers, bottom to top. */
  layers?: string[];
};

export type MenuCategory = {
  id: "burgers" | "sides" | "drinks";
  title: string;
  note: string;
  products: Product[];
};

const partLabel: Record<StackPart, string> = {
  bottomBun: "Toasted bun",
  patty: "Smashed patty",
  cheese: "American cheese",
  lettuce: "Lettuce",
  tomato: "Tomato",
  onion: "Red onion",
  pickles: "Pickles",
  chicken: "Buttermilk chicken",
  slaw: "Cold slaw",
  topBun: "Sesame brioche",
  topBunPotato: "Seeded potato bun",
};

function burger(stack: StackPart[]): { model: ProductModel; layers: string[] } {
  return { model: { kind: "burger", stack }, layers: stack.map((p) => partLabel[p]) };
}

export const menu: MenuCategory[] = [
  {
    id: "burgers",
    title: "Burgers",
    note: "Every one of them toasted, smashed and stacked to order.",
    products: [
      {
        id: "classic-smash",
        name: "Classic Smash",
        description: "One smashed patty, American cheese, shaved onion, pickles, seeded potato bun.",
        price: "9",
        interaction: "explode",
        hint: "Take it apart",
        ...burger(["bottomBun", "patty", "cheese", "onion", "pickles", "topBunPotato"]),
      },
      {
        id: "double-stack",
        name: "Double Stack",
        description: "Two patties, two slices of cheese, pickles, onion. For when one wasn't enough.",
        price: "13",
        interaction: "explode",
        hint: "Take it apart",
        ...burger(["bottomBun", "patty", "cheese", "patty", "cheese", "onion", "pickles", "topBun"]),
      },
      {
        id: "crispy-chicken",
        name: "Crispy Chicken",
        description: "Buttermilk-fried chicken thigh, cold slaw, pickles, sesame brioche.",
        price: "11",
        interaction: "explode",
        hint: "Take it apart",
        ...burger(["bottomBun", "slaw", "chicken", "pickles", "topBun"]),
      },
      {
        id: "house-special",
        name: "House Special",
        description: "The one you watched being built. Every layer, in that exact order.",
        price: "14",
        interaction: "explode",
        hint: "Take it apart",
        ...burger(["bottomBun", "patty", "cheese", "lettuce", "tomato", "onion", "pickles", "topBun"]),
      },
    ],
  },
  {
    id: "sides",
    title: "Sides",
    note: "Salted while they're still loud.",
    products: [
      {
        id: "classic-fries",
        name: "Classic Fries",
        description: "Twice-cooked, sea salt. Crisp outside, soft in the middle.",
        price: "4.5",
        model: { kind: "fries" },
        interaction: "jostle",
        hint: "Give it a shake",
      },
      {
        id: "loaded-fries",
        name: "Loaded Fries",
        description: "Classic fries under cheese sauce, crispy shallots and pickled jalapeño.",
        price: "7",
        model: { kind: "loadedFries" },
        interaction: "jostle",
        hint: "Give it a shake",
      },
      {
        id: "onion-rings",
        name: "Onion Rings",
        description: "Thick-cut, beer-battered and stacked higher than strictly necessary.",
        price: "5.5",
        model: { kind: "onionRings" },
        interaction: "topple",
        hint: "Nudge the stack",
      },
    ],
  },
  {
    id: "drinks",
    title: "Drinks",
    note: "Cold. Very cold.",
    products: [
      {
        id: "cola",
        name: "Cola",
        description: "Served very cold, with too much ice and a paper straw.",
        price: "3",
        model: { kind: "cup", drink: "cola" },
        interaction: "stir",
        hint: "Give it a stir",
      },
      {
        id: "lemonade",
        name: "Lemonade",
        description: "Squeezed lemons, a little sugar, a lot of ice.",
        price: "3.5",
        model: { kind: "cup", drink: "lemonade" },
        interaction: "stir",
        hint: "Give it a stir",
      },
      {
        id: "strawberry-shake",
        name: "Strawberry Shake",
        description: "Strawberries, vanilla ice cream, whipped cream and a strawberry on top.",
        price: "6",
        model: { kind: "shake", flavor: "strawberry" },
        interaction: "wobble",
        hint: "Poke the cream",
      },
      {
        id: "house-shake",
        name: "House Shake",
        description: "Salted caramel and malt. Thick enough to need patience.",
        price: "6.5",
        model: { kind: "shake", flavor: "caramel" },
        interaction: "wobble",
        hint: "Poke the cream",
      },
    ],
  },
];

export const allProducts: Product[] = menu.flatMap((c) => c.products);

export function productById(id: string): Product {
  const p = allProducts.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown product: ${id}`);
  return p;
}

/** Shown on the landing page after the story. */
export const teaserProductIds = ["house-special", "loaded-fries", "strawberry-shake"] as const;
