import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidIndianPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/^(\+91|91|0)/, '').replace(/[\s-]/g, '');
  return /^[6-9][0-9]{9}$/.test(cleaned);
}

export function isValidIndianPincode(pincode: string): boolean {
  if (!pincode) return false;
  return /^[1-9][0-9]{5}$/.test(pincode.trim());
}
