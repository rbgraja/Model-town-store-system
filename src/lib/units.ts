export const UNITS = [
  "Piece",
  "KG",
  "Gram",
  "Liter",
  "ML",
  "Box",
  "Packet",
  "Dozen",
  "Bag",
  "Bottle",
  "Roll",
  "Set",
] as const;

export type Unit = (typeof UNITS)[number];
