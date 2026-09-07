export function bookingSummary(pricePerNight: number, checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return { nights: 0, subtotal: 0, tax: 0, total: 0 };
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  const nights = Math.max(0, Math.round((end - start) / 86_400_000));
  const subtotal = pricePerNight * nights;
  return { nights, subtotal, tax: 0, total: subtotal };
}
