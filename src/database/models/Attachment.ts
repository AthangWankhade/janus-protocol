import { Model } from "@nozbe/watermelondb";
import { date, relation, text } from "@nozbe/watermelondb/decorators";
import Note from "./Note";

export default class Attachment extends Model {
  static table = "attachments";
  static associations = {
    notes: { type: "belongs_to", key: "note_id" },
  } as const;

  @text("type") type!: "image" | "audio" | "document";
  @text("uri") uri!: string;
  @text("name") name!: string | null;
  @text("mime") mime!: string | null;
  @date("created_at") createdAt!: Date;

  @relation("notes", "note_id") note!: Note;
}
