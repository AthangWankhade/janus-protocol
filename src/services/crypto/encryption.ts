import QuickCrypto from "react-native-quick-crypto";

// CONSTANTS
const ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // Standard for GCM
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Hash the User's PIN/Password using PBKDF2
 * This creates the "Master Key" used to encrypt the database/files.
 */
export const deriveKey = (
  password: string,
  saltHex?: string
): { key: Buffer; salt: string } => {
  // If no salt provided, generate a new one
  const salt = saltHex
    ? Buffer.from(saltHex, "hex")
    : QuickCrypto.randomBytes(SALT_LENGTH);

  // PBKDF2 derivation (100,000 iterations)
  const key = QuickCrypto.pbkdf2Sync(
    password,
    salt,
    100000,
    KEY_LENGTH,
    "sha256"
  );

  return { key, salt: salt.toString("hex") };
};

/**
 * Encrypt a string (e.g., Note content)
 */
export const encryptData = (text: string, masterKey: Buffer) => {
  const iv = QuickCrypto.randomBytes(IV_LENGTH);
  const cipher = QuickCrypto.createCipheriv(ALGORITHM, masterKey, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Return format: IV:AuthTag:EncryptedContent
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
};

/**
 * Decrypt a string
 */
export const decryptData = (encryptedPackage: string, masterKey: Buffer) => {
  const [ivHex, authTagHex, encryptedHex] = encryptedPackage.split(":");

  // Allow encryptedHex to be empty string (for empty plaintext)
  if (!ivHex || !authTagHex || encryptedHex === undefined) {
    throw new Error("Invalid encrypted data format");
  }

  const decipher = QuickCrypto.createDecipheriv(
    ALGORITHM,
    masterKey,
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
