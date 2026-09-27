export function toInternationalPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return `421${digits.slice(1)}`;
  return digits;
}