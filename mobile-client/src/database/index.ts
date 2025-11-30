import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import Attachment from "./models/Attachment";
import Note from "./models/Note";
import { mySchema } from "./schema";

// Create the adapter to the underlying SQLite database
import migrations from "./migrations";

// Create the adapter to the underlying SQLite database
const adapter = new SQLiteAdapter({
  schema: mySchema,
  migrations,
  // dbName: 'janus_db', // optional
  jsi: true, // Uses JSI for faster database operations
  onSetUpError: (error) => {
    // Database failed to load - check if you are using Expo Go (requires Dev Client)
    console.error("Database failed to load:", error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Note, // Register our models here
    Attachment,
  ],
});
