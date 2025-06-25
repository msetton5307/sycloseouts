export function generateOrderCode(id: number): string {
  const multiplier = 9973; // prime number
  const offset = 12345;
  return 'O' + ((id * multiplier + offset).toString(36).toUpperCase());
}
