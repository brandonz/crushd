import { customAlphabet } from "nanoid";

// Visually unambiguous: no 0, O, I, 1, L
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const generateShortCode = customAlphabet(ALPHABET, 7);
