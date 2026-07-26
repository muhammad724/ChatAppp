// ============================================================================
// Supabase Storage Client - File Uploads (Avatars, Images, Videos, Files)
// ============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function getSupabaseServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = getSupabaseUrl();
    const key = getSupabaseServiceKey();
    if (!url || !key) {
      throw new Error("Supabase environment variables are not configured");
    }
    _supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

const AVATAR_BUCKET = "avatars";
const MESSAGE_FILE_BUCKET = "message-files";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export type UploadType = "avatar" | "message-file" | "message-image";

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: Buffer | Uint8Array,
  fileName: string,
  mimeType: string,
  uploadType: UploadType
): Promise<string> {
  const bucket =
    uploadType === "avatar" ? AVATAR_BUCKET : MESSAGE_FILE_BUCKET;

  // Generate a unique file path
  const ext = fileName.split(".").pop() || "bin";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${ext}`;
  const filePath = `${uploadType === "avatar" ? "avatars" : "uploads"}/${uniqueName}`;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(url: string): Promise<void> {
  // Extract file path from URL
  const bucket = url.includes(AVATAR_BUCKET)
    ? AVATAR_BUCKET
    : MESSAGE_FILE_BUCKET;
  const filePath = url.split(`${bucket}/`)[1];

  if (!filePath) return;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.error("Failed to delete file:", error.message);
  }
}

/**
 * Validate file size and type
 */
export function validateFile(
  file: { size: number; type: string },
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported`,
    };
  }

  return { valid: true };
}

/**
 * Get allowed MIME types for different upload types
 */
export function getAllowedMimeTypes(uploadType: UploadType): string[] {
  switch (uploadType) {
    case "avatar":
      return ["image/jpeg", "image/png", "image/webp", "image/gif"];
    case "message-image":
      return ["image/jpeg", "image/png", "image/webp", "image/gif"];
    case "message-file":
      return [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/webm",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "application/zip",
      ];
    default:
      return ["*/*"];
  }
}

// ─── Bucket Initialization ──────────────────────────────────────────────────

/**
 * Ensure required storage buckets exist (call on app startup)
 */
export async function ensureStorageBuckets(): Promise<void> {
  const buckets = [AVATAR_BUCKET, MESSAGE_FILE_BUCKET];
  const supabase = getSupabaseAdmin();

  for (const bucketName of buckets) {
    const { data: existing } = await supabase.storage.getBucket(bucketName);
    if (!existing) {
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
      });
      if (error) {
        console.error(`Failed to create bucket ${bucketName}:`, error.message);
      }
    }
  }
}

