export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export const RECEIPT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
};
export function validateReceipt(contentType: string, size: number) {
  if (!Object.prototype.hasOwnProperty.call(RECEIPT_TYPES, contentType)) throw new Error('Formato não suportado. Use JPG, PNG, WebP ou PDF.');
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_RECEIPT_BYTES) throw new Error('O comprovativo deve ter entre 1 byte e 10 MB.');
}
/** Accept legacy B2 URLs and new permanent object keys, never signed URLs. */
export function receiptKey(value: string): string {
  if (value.startsWith('expenses/')) return value;
  const url = new URL(value);
  const match = url.pathname.match(/^\/file\/[^/]+\/(.+)$/);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.backblazeb2.com') || !match) throw new Error('Referência de comprovativo inválida.');
  return decodeURIComponent(match[1]);
}
export function requireOwnedKey(value: string, userId: string): string {
  const key = receiptKey(value);
  if (!key.startsWith(`expenses/${userId}/`) || key.split('/').some(p => !p || p === '.' || p === '..') || /[\\\x00-\x1f]/.test(key)) throw new Error('Sem acesso a este comprovativo.');
  return key;
}
