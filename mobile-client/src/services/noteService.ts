import { database } from "@/database";
import { decryptData, encryptData } from "./crypto/encryption";
import { StorageService } from "./storageService";
import { syncService } from "./sync/syncService"; // <--- IMPORT THIS

const notesCollection = database.get("notes");

// Helper interface for file data
interface NoteFile {
  uri: string;
  name: string;
  mime: string;
}

export const NoteService = {
  /**
   * Create a new encrypted note with optional image, audio, and document
   */
  async createNote(
    title: string,
    content: string,
    masterKey: Buffer,
    imageUris: string[] = [],
    audioUris: string[] = [],
    videoUris: string[] = [], // New video array
    docFiles: any[] = [],
    id?: string // <--- NEW: Optional ID for idempotency
  ) {
    return await database.write(async () => {
      // If ID provided, check if exists (Idempotency check)
      if (id) {
        try {
          const existing = await notesCollection.find(id);
          if (existing) {
            console.log("Note already exists (idempotency), updating instead.");
            // If it exists, we should probably update it or just return it?
            // For now, let's just return it to avoid duplicate errors,
            // assuming the previous attempt succeeded in creation but failed elsewhere.
            // OR we could call updateNote here?
            // Let's assume if it exists, we treat it as "done" for creation purposes
            // and maybe the queue should have been an UPDATE if it was already created.
            // But since we are in "CREATE" mode, let's just update the content to be sure.
            return await existing.update((note: any) => {
              note.title = encryptData(title, masterKey);
              note.content = encryptData(content, masterKey);
            });
          }
        } catch (e) {
          // Not found, proceed to create
        }
      }

      const newNote = await notesCollection.create((note: any) => {
        if (id) note._raw.id = id; // Set explicit ID
        note.title = encryptData(title, masterKey);
        note.content = encryptData(content, masterKey);
        note.audioUri = null; // Legacy field unused
        note.isPinned = false;
        note.createdAt = new Date();

        // Legacy fields
        note.imageUri = null;
        note.fileUri = null;
        note.fileName = null;
        note.fileMime = null;
      });

      // Create Attachment records for Images
      for (const uri of imageUris) {
        const encryptedPath = await StorageService.saveEncryptedFile(
          uri,
          masterKey,
          "img_enc"
        );
        await database.get("attachments").create((att: any) => {
          att.note.set(newNote);
          att.type = "image";
          att.uri = encryptedPath;
          att.createdAt = new Date();
        });
      }

      // Create Attachment records for Audio
      for (const uri of audioUris) {
        const encryptedPath = await StorageService.saveEncryptedFile(
          uri,
          masterKey,
          "audio_enc"
        );
        await database.get("attachments").create((att: any) => {
          att.note.set(newNote);
          att.type = "audio";
          att.uri = encryptedPath;
          att.createdAt = new Date();
        });
      }

      // Create Attachment records for Videos
      for (const uri of videoUris) {
        const encryptedPath = await StorageService.saveEncryptedFile(
          uri,
          masterKey,
          "video_enc"
        );
        await database.get("attachments").create((att: any) => {
          att.note.set(newNote);
          att.type = "video";
          att.uri = encryptedPath;
          att.createdAt = new Date();
        });
      }

      // Create Attachment records for Docs
      for (const doc of docFiles) {
        const encryptedPath = await StorageService.saveEncryptedFile(
          doc.uri,
          masterKey,
          "doc_enc"
        );
        await database.get("attachments").create((att: any) => {
          att.note.set(newNote);
          att.type = "document";
          att.uri = encryptedPath;
          att.name = encryptData(doc.name, masterKey);
          att.mime = doc.mime;
          att.createdAt = new Date();
        });
      }

      // <--- TRIGGER SYNC PUSH
      syncService.sendChange("CREATE", "notes", {
        id: newNote.id,
        title: newNote.title,
        content: newNote.content,
      });
    });
  },

  /**
   * Fetch and decrypt all notes (Optimized for List View)
   * Only decrypts the first image (thumbnail) per note.
   */
  async getNotes(masterKey: Buffer) {
    const allNotes = await notesCollection.query().fetch();

    const decryptedNotes = await Promise.all(
      allNotes.map(async (note: any) => {
        try {
          let playAudio = null;

          // Fetch Attachments
          const attachments = await note.attachments.fetch();

          // Helper for safe decryption
          const safeDecrypt = (text: string | null, fallback = "") => {
            if (!text) return fallback;
            try {
              return decryptData(text, masterKey);
            } catch (e) {
              console.warn("Decryption warning:", e);
              return fallback || "Decryption Failed";
            }
          };

          const finalAttachments = attachments.map((att: any) => ({
            id: att.id,
            type: att.type,
            encryptedPath: att.uri, // Store encrypted path
            name: att.name ? safeDecrypt(att.name, "Unknown") : null,
            mime: att.mime,
          }));

          const imageAttachments = finalAttachments.filter(
            (a: any) => a.type === "image"
          );
          const docAttachments = finalAttachments.filter(
            (a: any) => a.type === "document"
          );
          const audioAttachments = finalAttachments.filter(
            (a: any) => a.type === "audio"
          );
          const videoAttachments = finalAttachments.filter(
            (a: any) => a.type === "video"
          );

          // OPTIMIZED: Only decrypt the FIRST image for the thumbnail
          const loadedImages = await Promise.all(
            imageAttachments.map(async (img: any, index: number) => {
              if (index === 0) {
                return await StorageService.loadEncryptedFile(
                  img.encryptedPath,
                  masterKey,
                  false
                );
              } else {
                // Return placeholder/encrypted path for count, but don't decrypt yet
                return img.encryptedPath;
              }
            })
          );

          // Legacy Fallback
          if (loadedImages.length === 0 && note.imageUri) {
            const legacyImg = await StorageService.loadEncryptedFile(
              note.imageUri,
              masterKey,
              false
            );
            if (legacyImg) loadedImages.push(legacyImg);
          }

          // OPTIMIZED: Do NOT decrypt audio/video for list view OR detail view initially
          // Just return the encrypted paths. The UI will decrypt them on demand.
          const loadedAudios = audioAttachments.map((a: any) => ({
            originalUri: a.encryptedPath, // Keep track of the encrypted path
            isEncrypted: true,
          }));
          const loadedVideos = videoAttachments.map((v: any) => ({
            originalUri: v.encryptedPath,
            isEncrypted: true,
          }));

          // Legacy Audio Fallback
          if (note.audioUri) {
            const legacyAudio = await StorageService.loadEncryptedFile(
              note.audioUri,
              masterKey,
              true,
              "m4a"
            );
            if (legacyAudio) loadedAudios.push(legacyAudio);
          }

          // Legacy Doc Fallback
          if (docAttachments.length === 0 && note.fileUri) {
            docAttachments.push({
              encryptedPath: note.fileUri,
              name: safeDecrypt(note.fileName, "Unknown Document"),
              mime: note.fileMime,
            });
          }

          return {
            id: note.id,
            title: safeDecrypt(note.title, "Untitled Note"),
            content: safeDecrypt(note.content, ""),
            images: loadedImages.filter((i: any) => i !== null), // Mix of DataURI (0) and Paths (1+)
            audio: loadedAudios.filter((a: any) => a !== null), // Array of audio URIs
            videos: loadedVideos.filter((v: any) => v !== null), // Array of video URIs
            documents: docAttachments,
            isPinned: note.isPinned,
            deletedAt: note.deletedAt,
            createdAt: note.createdAt,
          };
        } catch (e) {
          console.error("Decryption error for note:", note.id, e);
          return {
            id: note.id,
            title: "Error",
            content: "Decryption Failed",
            createdAt: note.createdAt,
            images: [],
            documents: [],
          };
        }
      })
    );

    // Filter nulls and Sort: Pinned first, then newest
    return decryptedNotes
      .filter((n) => n !== null)
      .sort((a: any, b: any) => {
        if (a.isPinned === b.isPinned) {
          return b.createdAt - a.createdAt;
        }
        return a.isPinned ? -1 : 1;
      });
  },

  /**
   * Fetch full details for a single note (decrypts ALL images)
   */
  async getNoteDetails(noteId: string, masterKey: Buffer) {
    const note = await notesCollection.find(noteId);
    const attachments = await note.attachments.fetch();

    const safeDecrypt = (text: string | null, fallback = "") => {
      if (!text) return fallback;
      try {
        return decryptData(text, masterKey);
      } catch (e) {
        return fallback;
      }
    };

    const finalAttachments = attachments.map((att: any) => ({
      id: att.id,
      type: att.type,
      encryptedPath: att.uri,
      name: att.name ? safeDecrypt(att.name, "Unknown") : null,
      mime: att.mime,
    }));

    const imageAttachments = finalAttachments.filter(
      (a: any) => a.type === "image"
    );
    const videoAttachments = finalAttachments.filter(
      (a: any) => a.type === "video"
    );

    // OPTIMIZED: Return encrypted objects for Lazy Loading
    // The UI will handle decryption (Auto for images, Manual for videos)
    const loadedImages = imageAttachments.map((img: any) => ({
      originalUri: img.encryptedPath,
      isEncrypted: true,
    }));

    const loadedVideos = videoAttachments.map((vid: any) => ({
      originalUri: vid.encryptedPath,
      isEncrypted: true,
    }));

    // Legacy Image Fallback
    if (loadedImages.length === 0 && note.imageUri) {
      // Treat legacy image as encrypted too (it likely is)
      loadedImages.push({
        originalUri: note.imageUri,
        isEncrypted: true,
      });
    }

    return {
      images: loadedImages,
      videos: loadedVideos,
    };
  },

  /**
   * Soft delete a note (move to trash)
   */
  async softDeleteNote(id: string) {
    await database.write(async () => {
      const note = await notesCollection.find(id);
      await note.update((r: any) => {
        r.deletedAt = new Date();
      });
      syncService.sendChange("UPDATE", "notes", {
        id: note.id,
        deletedAt: note.deletedAt,
      });
    });
  },

  /**
   * Restore a note from trash
   */
  async restoreNote(id: string) {
    await database.write(async () => {
      const note = await notesCollection.find(id);
      await note.update((r: any) => {
        r.deletedAt = null;
      });
      syncService.sendChange("UPDATE", "notes", {
        id: note.id,
        deletedAt: null,
      });
    });
  },

  /**
   * Permanently Delete (Optional, for emptying trash)
   */
  async deleteNotePermanent(id: string) {
    await database.write(async () => {
      const note = await notesCollection.find(id);
      await note.markAsDeleted(); // WatermelonDB syncable delete
      await note.destroyPermanently();
    });
  },

  async updateNote(
    id: string,
    title: string,
    content: string,
    masterKey: Buffer,
    imageUri?: string | null,
    audioUris: string[] = [],
    videoUris: string[] = [] // <--- New video array
  ) {
    let newEncryptedPath = undefined;

    // If a new image is provided, encrypt it
    if (imageUri) {
      newEncryptedPath = await StorageService.saveEncryptedImage(
        imageUri,
        masterKey
      );
    } else if (imageUri === null) {
      newEncryptedPath = null; // Explicitly remove image
    }

    await database.write(async () => {
      const note = await notesCollection.find(id);
      await note.update((r: any) => {
        r.title = encryptData(title, masterKey);
        r.content = encryptData(content, masterKey);

        // Only update image if it was explicitly changed (not undefined)
        if (imageUri !== undefined) {
          r.imageUri = newEncryptedPath;
        }
      });

      // Add NEW Audio Attachments
      for (const uri of audioUris) {
        const encryptedPath = await StorageService.saveEncryptedFile(
          uri,
          masterKey,
          "audio_enc"
        );
        await database.get("attachments").create((att: any) => {
          att.note.set(note);
          att.type = "audio";
          att.uri = encryptedPath;
          att.createdAt = new Date();
        });
      }

      // Add NEW Video Attachments
      for (const uri of videoUris) {
        const encryptedPath = await StorageService.saveEncryptedFile(
          uri,
          masterKey,
          "video_enc"
        );
        await database.get("attachments").create((att: any) => {
          att.note.set(note);
          att.type = "video";
          att.uri = encryptedPath;
          att.createdAt = new Date();
        });
      }

      // <--- TRIGGER SYNC PUSH
      syncService.sendChange("UPDATE", "notes", {
        id: note.id,
        title: note.title,
        content: note.content,
        // Also sync image update if applicable
        ...(imageUri !== undefined && { imageUri: newEncryptedPath }),
      });
    });
  },

  /**
   * NEW: Toggle Pin Status
   */
  async togglePin(id: string) {
    await database.write(async () => {
      const note = await notesCollection.find(id);
      await note.update((r: any) => {
        r.isPinned = !r.isPinned;
      });
      // We don't sync 'pin' status in this prototype, but you could add it easily
    });
  },

  /**
   * NEW: Handle incoming changes from other devices
   */
  async applyRemoteChange(action: string, data: any) {
    console.log("🔄 Applying Remote Change:", action);

    // We use a try-catch to avoid crashing if the note doesn't exist
    try {
      await database.write(async () => {
        if (action === "CREATE") {
          // check if exists first to avoid duplicate errors
          try {
            const existing = await notesCollection.find(data.id);
            if (existing) return; // Already have it
          } catch {
            // Not found, proceed to create
            await notesCollection.create((note: any) => {
              note._raw.id = data.id; // Force ID to match other device
              note.title = data.title; // Already encrypted
              note.content = data.content; // Already encrypted
              note.imageUri = data.imageUri;
              note.audioUri = data.audioUri;

              // New Doc Fields
              note.fileUri = data.fileUri;
              note.fileName = data.fileName;
              note.fileMime = data.fileMime;

              note.isPinned = false;
              note.createdAt = new Date();
            });
          }
        } else if (action === "UPDATE") {
          const note = await notesCollection.find(data.id);
          await note.update((r: any) => {
            if (data.deletedAt) {
              r.deletedAt = new Date(data.deletedAt);
            } else {
              r.title = data.title;
              r.content = data.content;
              if (data.imageUri !== undefined) {
                r.imageUri = data.imageUri;
              }
            }
          });
        }
      });
    } catch (e) {
      console.error("Failed to apply remote change", e);
    }
  },
};
