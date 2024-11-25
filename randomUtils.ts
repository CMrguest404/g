// randomUtils.ts

// Fungsi untuk membuat random string dengan jenis tertentu (alphanumeric, uppercase, lowercase, numeric)
export function generateRandomString(length: number, type: 'alphanumeric' | 'uppercase' | 'lowercase' | 'numeric'): string {
    let chars = '';
    
    if (type === 'alphanumeric') {
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    } else if (type === 'uppercase') {
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    } else if (type === 'lowercase') {
      chars = 'abcdefghijklmnopqrstuvwxyz';
    } else if (type === 'numeric') {
      chars = '0123456789'; // Hanya angka
    }
  
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }
  