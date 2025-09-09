import { customAlphabet } from 'nanoid';

// Create a custom nanoid generator with specific characters
const generateId = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*',
  12
);

export function generateSecurePassword(): string {
  return generateId();
}