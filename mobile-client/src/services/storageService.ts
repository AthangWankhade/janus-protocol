import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";
import { decryptData, encryptData } from "./crypto/encryption";

const VAULT_DIR = FileSystem.documentDirectory + "vault_media/";

// Ensure directory exists
const ensureDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(VAULT_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
  }
};

export const StorageService = {
  /**
   * Generic: Reads ANY file (Image/Audio), encrypts it, and saves to Vault.
   */
  async saveEncryptedFile(
    originalUri: string,
    masterKey: Buffer,
    extension: string = "enc"
  ): Promise<string> {
    await ensureDir();

    // 1. Read file as Base64
    const base64Data = await FileSystem.readAsStringAsync(originalUri, {
      encoding: "base64",
    });

    // 2. Encrypt
    const encryptedData = encryptData(base64Data, masterKey);

    // 3. Save
    const filename = `file_${Date.now()}.${extension}`;
    const destination = VAULT_DIR + filename;

    await FileSystem.writeAsStringAsync(destination, encryptedData, {
      encoding: "utf8",
    });

    return destination;
  },

  /**
   * Backward compatibility alias for saveEncryptedImage
   */
  async saveEncryptedImage(originalUri: string, masterKey: Buffer) {
    return this.saveEncryptedFile(originalUri, masterKey, "enc");
  },

  /**
   * Generic: Decrypts file and returns a usable URI (Data URI or Temp File).
   * For Audio/Docs, we must write to a temp file because Expo AV/Sharing need a file path.
   */
  async loadEncryptedFile(
    encryptedUri: string,
    masterKey: Buffer,
    saveAsFile = false, // If true, saves to temp file. If false, returns Data URI.
    extension = "tmp" // Extension for the temp file (e.g., 'm4a', 'pdf')
  ): Promise<string | null> {
    try {
      const encryptedData = await FileSystem.readAsStringAsync(encryptedUri, {
        encoding: "utf8",
      });

      const base64Data = decryptData(encryptedData, masterKey);

      if (saveAsFile) {
        // Write to a temp file with the correct extension
        const tempPath =
          FileSystem.cacheDirectory + `temp_${Date.now()}.${extension}`;
        await FileSystem.writeAsStringAsync(tempPath, base64Data, {
          encoding: "base64",
        });
        return tempPath;
      } else {
        // Images can use Data URI
        return `data:image/jpeg;base64,${base64Data}`;
      }
    } catch (e) {
      console.error("Failed to load file", e);
      return null;
    }
  },

  /**
   * Backward compatibility alias for loadEncryptedImage
   */
  async loadEncryptedImage(encryptedUri: string, masterKey: Buffer) {
    return this.loadEncryptedFile(encryptedUri, masterKey, false);
  },
};
