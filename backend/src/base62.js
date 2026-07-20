const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = BigInt(ALPHABET.length);

export function encode(id) {
  let n = BigInt(id);
  if (n === 0n) return ALPHABET[0];
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % BASE)] + out;
    n = n / BASE;
  }
  return out;
}

export function decode(code) {
  let n = 0n;
  for (const ch of code) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base62 character: ${ch}`);
    n = n * BASE + BigInt(idx);
  }
  return n;
}
