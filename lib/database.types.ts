/**
 * Hand-written to match supabase/schema.sql.
 *
 * Once your project is live you can regenerate this file instead:
 *   npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
 */

export type FileKind = 'text' | 'audio';

export type FolderRow = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
};

export type FileRow = {
  id: string;
  folder_id: string | null;
  name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  kind: FileKind;
  /** Optional name the uploader attached to the file. */
  uploaded_by: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      folders: {
        Row: FolderRow;
        Insert: Partial<Pick<FolderRow, 'id' | 'created_at'>> &
          Pick<FolderRow, 'name' | 'parent_id'>;
        Update: Partial<FolderRow>;
        Relationships: [];
      };
      files: {
        Row: FileRow;
        Insert: Partial<
          Pick<FileRow, 'id' | 'created_at' | 'mime_type' | 'size_bytes' | 'uploaded_by'>
        > &
          Pick<FileRow, 'folder_id' | 'name' | 'storage_path' | 'kind'>;
        Update: Partial<FileRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
