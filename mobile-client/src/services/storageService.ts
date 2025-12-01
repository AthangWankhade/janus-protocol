import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";
import {
  createDecryptionSession,
  createEncryptionSession,
} from "./crypto/encryption";

const VAULT_DIR = FileSystem.documentDirectory + "vault_media/";
// CHUNK_SIZE must be a multiple of 3 to ensure Base64 strings don't have padding in the middle
const CHUNK_SIZE = 2097150; // ~2MB (Math.floor((2 * 1024 * 1024) / 3) * 3)

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

    // 1. Get File Info
    const fileInfo = await FileSystem.getInfoAsync(originalUri);
    if (!fileInfo.exists) throw new Error("File does not exist");
    const fileSize = fileInfo.size;

    // 2. Start Encryption Session
    const { cipher, iv, getAuthTag } = createEncryptionSession(masterKey);
    const parts: string[] = [];

    // 3. Loop Chunks
    let offset = 0;
    while (offset < fileSize) {
      const length = Math.min(CHUNK_SIZE, fileSize - offset);

      // Read chunk as Base64
      const chunkBase64 = await FileSystem.readAsStringAsync(originalUri, {
        encoding: "base64",
        position: offset,
        length: length,
      });

      // Encrypt chunk
      const encryptedChunk = cipher.update(chunkBase64, "utf8", "hex");
      parts.push(encryptedChunk);

      offset += length;

      // Yield to UI thread every chunk to prevent freeze
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // 4. Finalize
    const finalChunk = cipher.final("hex");
    parts.push(finalChunk);
    const authTag = getAuthTag();

    // 5. Construct Final String (IV:AuthTag:EncryptedContent)
    // Note: We are still joining a large string in memory, but at least
    // the CPU-intensive encryption was yielded.
    const fullEncryptedContent = parts.join("");
    const finalData = `${iv.toString("hex")}:${authTag.toString(
      "hex"
    )}:${fullEncryptedContent}`;

    // 6. Save
    const filename = `file_${Date.now()}.${extension}`;
    const destination = VAULT_DIR + filename;

    await FileSystem.writeAsStringAsync(destination, finalData, {
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
    extension = "tmp", // Extension for the temp file (e.g., 'm4a', 'pdf')
    onProgress?: (progress: number) => void // <--- New Progress Callback
  ): Promise<string | null> {
    try {
      // 1. Get File Info
      const fileInfo = await FileSystem.getInfoAsync(encryptedUri);
      if (!fileInfo.exists) throw new Error("File not found");
      const fileSize = fileInfo.size;

      // 2. Read Header (IV:AuthTag) to setup session
      // We assume header is within first 1024 bytes
      const headerChunk = await FileSystem.readAsStringAsync(encryptedUri, {
        encoding: "utf8",
        length: 1024,
      });

      const firstColon = headerChunk.indexOf(":");
      const secondColon = headerChunk.indexOf(":", firstColon + 1);

      if (firstColon === -1 || secondColon === -1) {
        throw new Error("Invalid file format");
      }

      const ivHex = headerChunk.substring(0, firstColon);
      const authTagHex = headerChunk.substring(firstColon + 1, secondColon);
      const contentStartIndex = secondColon + 1;

      // 3. Start Decryption Session
      const { decipher } = createDecryptionSession(
        masterKey,
        ivHex,
        authTagHex
      );
      const parts: string[] = [];

      // 4. Loop Chunks (Pipelined)
      let offset = contentStartIndex;

      // Initial Read
      let nextChunkPromise = FileSystem.readAsStringAsync(encryptedUri, {
        encoding: "base64",
        position: offset,
        length: Math.min(CHUNK_SIZE, fileSize - offset),
      });

      while (offset < fileSize) {
        // Await the chunk we started reading in the previous iteration
        const chunkBase64 = await nextChunkPromise;

        const currentChunkLength = Math.min(CHUNK_SIZE, fileSize - offset);
        offset += currentChunkLength;

        // Start reading the NEXT chunk immediately (if there is one)
        if (offset < fileSize) {
          nextChunkPromise = FileSystem.readAsStringAsync(encryptedUri, {
            encoding: "base64",
            position: offset,
            length: Math.min(CHUNK_SIZE, fileSize - offset),
          });
        }

        // Process current chunk (CPU intensive)
        // Convert Base64 -> UTF8 String (which is our Hex data)
        const chunkHex = Buffer.from(chunkBase64, "base64").toString("utf8");

        // Decrypt chunk
        const decryptedChunk = decipher.update(chunkHex, "hex", "utf8");
        parts.push(decryptedChunk);

        // Report Progress
        if (onProgress) {
          const progress = Math.min(
            1,
            (offset - contentStartIndex) / (fileSize - contentStartIndex)
          );
          onProgress(progress);
        }

        // Yield occasionally
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // 5. Finalize
      const finalChunk = decipher.final("utf8");
      parts.push(finalChunk);

      const fullDecryptedData = parts.join("");

      if (saveAsFile) {
        // Write to a temp file with the correct extension
        const tempPath =
          FileSystem.cacheDirectory + `temp_${Date.now()}.${extension}`;
        await FileSystem.writeAsStringAsync(tempPath, fullDecryptedData, {
          encoding: "base64",
        });
        return tempPath;
      } else {
        // Images can use Data URI
        // Note: If saveAsFile is false, we decrypted as utf8 (which is actually base64 string of image)
        // Wait, encryptData takes Base64 and outputs Hex.
        // So decryptData takes Hex and outputs Base64.
        // If saveAsFile=false (Image), we want the Base64 string to form a Data URI.
        // So we should ALWAYS decrypt to 'utf8' (which is the Base64 string)?
        // NO.
        // encryptData: File(Base64) -> Cipher -> Hex
        // decryptData: Hex -> Decipher -> File(Base64)
        // So decipher.update output is ALWAYS Base64 (the original file content).
        // So my `saveAsFile ? "base64" : "utf8"` logic above was wrong if I want the original Base64.
        // Actually, `decipher.update(..., 'utf8')` returns the *string* representation.
        // Since the original input to encrypt was a Base64 *string*, the output of decrypt is that Base64 *string*.
        // So 'utf8' is correct to get the Base64 string.

        // RE-CORRECTION:
        // Input: Base64 String.
        // Encrypt: Input(utf8) -> Hex.
        // Decrypt: Input(Hex) -> Output(utf8).
        // Result: Base64 String.

        // So `fullDecryptedData` IS the Base64 string.

        // If saveAsFile=true:
        // We write `fullDecryptedData` (Base64 string) to file using `encoding: base64`.
        // This works because `writeAsStringAsync` with `base64` expects a Base64 string and writes binary.

        // If saveAsFile=false:
        // We return `data:image/jpeg;base64,${fullDecryptedData}`.

        // So in BOTH cases, we want `decipher.update` to output 'utf8' (the Base64 string).
        // My previous code `saveAsFile ? "base64" : "utf8"` was likely wrong/confusing.
        // Let's fix it to always be 'utf8' (which means "return the plaintext string", which happens to be Base64).

        return `data:image/jpeg;base64,${fullDecryptedData}`;
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
