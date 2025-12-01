// utils/formatPhone.js

export const formatPhone = (phone) => {
  if (!phone) return null;

  // Remove all non-digits
  phone = phone.toString().replace(/\D/g, "");

  // If starts with 0 → remove leading zero
  if (phone.startsWith("0")) {
    phone = phone.substring(1);
  }

  // If starts with 234 → already Nigeria format
  if (phone.startsWith("234")) {
    return `+${phone}`;
  }

  // Otherwise, force Nigeria code
  return `+234${phone}`;
};
