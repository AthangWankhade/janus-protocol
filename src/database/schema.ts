import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const mySchema = appSchema({
  version: 6, // Increment version
  tables: [
    tableSchema({
      name: "notes",
      columns: [
        { name: "title", type: "string" },
        { name: "content", type: "string" },
        { name: "created_at", type: "number" },
        { name: "is_pinned", type: "boolean" },
        { name: "image_uri", type: "string", isOptional: true },
        { name: "audio_uri", type: "string", isOptional: true },
        // NEW FIELDS FOR DOCS
        { name: "file_uri", type: "string", isOptional: true },
        { name: "file_name", type: "string", isOptional: true },
        { name: "file_mime", type: "string", isOptional: true },
        // NEW
        { name: "deleted_at", type: "number", isOptional: true },
      ],
    }),
    tableSchema({
      name: "attachments",
      columns: [
        { name: "note_id", type: "string", isIndexed: true },
        { name: "type", type: "string" }, // 'image', 'audio', 'document'
        { name: "uri", type: "string" },
        { name: "name", type: "string", isOptional: true },
        { name: "mime", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
      ],
    }),
  ],
});
