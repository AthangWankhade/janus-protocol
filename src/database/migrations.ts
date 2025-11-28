import {
  addColumns,
  createTable,
  schemaMigrations,
} from "@nozbe/watermelondb/Schema/migrations";

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: "notes",
          columns: [{ name: "image_uri", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: "notes",
          columns: [{ name: "audio_uri", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: "notes",
          columns: [
            { name: "file_uri", type: "string", isOptional: true },
            { name: "file_name", type: "string", isOptional: true },
            { name: "file_mime", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: "notes",
          columns: [{ name: "deleted_at", type: "number", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 6,
      steps: [
        createTable({
          name: "attachments",
          columns: [
            { name: "note_id", type: "string", isIndexed: true },
            { name: "type", type: "string" },
            { name: "uri", type: "string" },
            { name: "name", type: "string", isOptional: true },
            { name: "mime", type: "string", isOptional: true },
            { name: "created_at", type: "number" },
          ],
        }),
      ],
    },
  ],
});
