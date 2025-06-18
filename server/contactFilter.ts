export function containsContactInfo(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();

  // Detect email addresses
  const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  if (emailRegex.test(lower)) return true;

  // Detect sequences of digits, ignoring separators
  const digits = lower.replace(/[^0-9]/g, "");
  if (digits.length >= 7) return true;

  // Detect spelled-out numbers in English or Spanish
  const numberWords = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    // Spanish equivalents
    "cero",
    "uno",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
  ];
  const words = lower.split(/[^a-z]/).filter(Boolean);
  let spelledCount = 0;
  for (const w of words) {
    if (numberWords.includes(w)) spelledCount++;
  }
  if (spelledCount >= 7) return true;

  // Keywords that typically precede contact info
  if (/\b(phone|call\s+me|email|e-mail)\b/.test(lower)) return true;

  return false;
}
