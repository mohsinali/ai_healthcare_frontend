export function formatPhoneNumber(value: string) {
  const match = value.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return match ? `+1 ${match[1]} ${match[2]} ${match[3]}` : value;
}
export function isInternationalPhone(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value.replace(/[\s().-]/g, ""));
}
