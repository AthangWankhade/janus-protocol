// import { NoteService } from "../noteService"; // Removed to break cycle

// CHANGE THIS IP to your computer's local IP
const WS_URL = "wss://sync-relay-production.up.railway.app/ws";

class SyncService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private onMessageCallback: ((message: any) => void) | null = null;

  setOnMessage(callback: (message: any) => void) {
    this.onMessageCallback = callback;
  }

  connect() {
    if (this.ws && this.isConnected) return;

    console.log("🔌 Connecting to Sync Relay...");
    try {
      this.ws = new WebSocket(WS_URL);
    } catch (e) {
      console.log("Sync connection failed immediately");
      return;
    }

    this.ws.onopen = () => {
      console.log("✅ Connected to Sync Relay");
      this.isConnected = true;
    };

    this.ws.onmessage = (e) => {
      try {
        const message = JSON.parse(e.data);
        console.log("📩 Received Sync Message:", message.action);

        if (this.onMessageCallback) {
          this.onMessageCallback(message);
        }
      } catch (err) {
        console.error("Error parsing sync message", err);
      }
    };

    this.ws.onerror = (e) => {
      console.log("❌ Sync Error:", (e as any).message);
    };

    this.ws.onclose = () => {
      console.log("Disconnected from Sync Relay");
      this.isConnected = false;
      this.ws = null;
    };
  }

  sendChange(action: "CREATE" | "UPDATE", table: string, data: any) {
    if (this.ws && this.isConnected) {
      const payload = JSON.stringify({
        action,
        table,
        timestamp: Date.now(),
        payload: data,
      });
      this.ws.send(payload);
      console.log("🚀 Sync Pushed:", action);
    }
  }
}

export const syncService = new SyncService();
