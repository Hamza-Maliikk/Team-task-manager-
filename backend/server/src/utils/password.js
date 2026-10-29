import { randomInt } from 'crypto';

// No look-alike characters (0/O, 1/l/I) so the password is easy to read from an email
const SETS = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789'];

export function generatePassword(length = 12) {
  const all = SETS.join('');
  const chars = SETS.map((set) => set[randomInt(set.length)]); // at least one of each kind
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) { // shuffle
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}