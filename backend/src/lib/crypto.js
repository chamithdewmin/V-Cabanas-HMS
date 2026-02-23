import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const getKey = () => {
  const secret = process.env.BANK_ENCRYPTION_KEY || process.env.JWT_SECRET || 'myaccounts-default-key-change-in-production';
  return crypto.createHash('sha256').update(secret).digest();
};

export const encrypt = (plainText) => {
  if (!plainText) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string') return null;
  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encrypted) return null;
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
};
