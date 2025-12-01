import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";
import * as SecureStore from "expo-secure-store";
import { NoteService } from "./noteService";

const QUEUE_KEY = "save_queue_v1";
const TEMP_KEY_ALIAS = "temp_master_key";

interface QueueItem {
  id: string; // Unique ID for the queue item
  type: "CREATE" | "UPDATE";
  noteId?: string; // For updates
  data: {
    title: string;
    content: string;
    imageUris?: string[]; // Legacy or new
    audioUris?: string[];
    videoUris?: string[];
    docFiles?: any[];
    // For updates:
    imageUri?: string | null; // Legacy update field
    newAudioUris?: string[];
    newVideoUris?: string[];
  };
  timestamp: number;
}

export const SaveQueueService = {
  isProcessing: false,

  /**
   * Add a note operation to the queue and trigger processing
   */
  async addToQueue(
    type: "CREATE" | "UPDATE",
    data: any,
    masterKey: Buffer,
    providedNoteId?: string
  ) {
    try {
      // 1. Persist Master Key securely (if not already)
      // We convert Buffer to Base64 string for storage
      await SecureStore.setItemAsync(
        TEMP_KEY_ALIAS,
        masterKey.toString("base64")
      );

      // 2. Create Queue Item
      // Generate ID for the note if it's a CREATE operation (for idempotency)
      const queueItemId =
        Date.now().toString() + Math.random().toString().slice(2, 5);
      const noteId =
        type === "CREATE"
          ? Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)
          : providedNoteId;

      const item: QueueItem = {
        id: queueItemId,
        type,
        noteId: noteId, // Store the note ID in the item
        data,
        timestamp: Date.now(),
      };

      // 3. Save to AsyncStorage
      const currentQueue = await this.getQueue();
      const newQueue = [...currentQueue, item];
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));

      console.log(
        `[Queue] Added item ${item.id}. Queue size: ${newQueue.length}`
      );

      // 4. Trigger Processing (Fire and Forget)
      this.processQueue();
    } catch (e) {
      console.error("[Queue] Failed to add item:", e);
      throw e;
    }
  },

  /**
   * Get current queue items
   */
  async getQueue(): Promise<QueueItem[]> {
    try {
      const json = await AsyncStorage.getItem(QUEUE_KEY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },

  /**
   * Process the queue sequentially
   */
  async processQueue(providedKey?: Buffer) {
    if (this.isProcessing) {
      console.log("[Queue] Already processing...");
      return;
    }

    this.isProcessing = true;

    try {
      // 1. Retrieve Master Key
      let masterKey = providedKey;
      if (!masterKey) {
        const storedKey = await SecureStore.getItemAsync(TEMP_KEY_ALIAS);
        if (storedKey) {
          masterKey = Buffer.from(storedKey, "base64");
        }
      }

      if (!masterKey) {
        console.log("[Queue] No master key found. Pausing queue until unlock.");
        this.isProcessing = false;
        return;
      }

      // 2. Loop through queue
      let queue = await this.getQueue();

      while (queue.length > 0) {
        const item = queue[0]; // Peek first item
        console.log(`[Queue] Processing item ${item.id} (${item.type})...`);

        try {
          if (item.type === "CREATE") {
            await NoteService.createNote(
              item.data.title,
              item.data.content,
              masterKey,
              item.data.imageUris || [],
              item.data.audioUris || [],
              item.data.videoUris || [],
              item.data.docFiles || [],
              item.noteId // Pass the ID for idempotency
            );
          } else if (item.type === "UPDATE" && item.noteId) {
            await NoteService.updateNote(
              item.noteId,
              item.data.title,
              item.data.content,
              masterKey,
              item.data.imageUri,
              item.data.newAudioUris || [],
              item.data.newVideoUris || []
            );
          }

          // Success! Remove from queue
          queue.shift();
          await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
          console.log(`[Queue] Item ${item.id} completed.`);
        } catch (e) {
          console.error(`[Queue] Failed to process item ${item.id}:`, e);
          // For now, we'll remove it to prevent blocking the queue forever
          // In a real app, you might want a retry count or "dead letter queue"
          queue.shift();
          await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        }

        // Refresh queue state in case new items were added while processing
        queue = await this.getQueue();

        // YIELD TO UI: Wait 500ms to let the UI thread breathe
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // 3. Cleanup
      console.log("[Queue] Processing finished. Cleaning up key.");
      await SecureStore.deleteItemAsync(TEMP_KEY_ALIAS);
    } catch (e) {
      console.error("[Queue] Fatal processing error:", e);
    } finally {
      this.isProcessing = false;
    }
  },

  /**
   * Resume queue on app launch
   */
  async resumeQueue() {
    console.log("[Queue] Attempting to resume...");
    const storedKey = await SecureStore.getItemAsync(TEMP_KEY_ALIAS);
    if (storedKey) {
      console.log("[Queue] Found temp key. Resuming processing.");
      const masterKey = Buffer.from(storedKey, "base64");
      this.processQueue(masterKey);
    } else {
      console.log("[Queue] No temp key found. Nothing to resume.");
    }
  },
};
