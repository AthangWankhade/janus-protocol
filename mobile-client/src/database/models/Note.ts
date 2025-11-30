import { Model } from "@nozbe/watermelondb";
import { children, date, field, text } from "@nozbe/watermelondb/decorators";

export default class Note extends Model {
  static table = "notes";
  static associations = {
    attachments: { type: "has_many", foreignKey: "note_id" },
  } as const;

  @text("title") title!: string;
  @text("content") content!: string;
  @field("is_pinned") isPinned!: boolean;
  @date("created_at") createdAt!: Date;
  @text("image_uri") imageUri!: string | null;
  @text("audio_uri") audioUri!: string | null;

  // NEW
  @text("file_uri") fileUri!: string | null;
  @text("file_name") fileName!: string | null;
  @text("file_mime") fileMime!: string | null;
  @date("deleted_at") deletedAt!: Date | null;

  @children("attachments") attachments!: any;
}
