// ============================================================================
// POST /api/upload - Upload files via Supabase Storage
// ============================================================================

import { NextResponse } from "next/server";
import { getAuthPayload } from "@/src/lib/auth";
import {
  uploadFile,
  validateFile,
  getAllowedMimeTypes,
  type UploadType,
} from "@/src/lib/upload";

const uploadTypes: UploadType[] = ["avatar", "message-file", "message-image"];

function isUploadType(value: string): value is UploadType {
  return uploadTypes.includes(value as UploadType);
}

export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const requestedType = formData.get("type");
    const uploadType =
      typeof requestedType === "string" ? requestedType : "message-file";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!isUploadType(uploadType)) {
      return NextResponse.json(
        { success: false, error: "Invalid upload type" },
        { status: 400 }
      );
    }

    // Validate file
    const allowedTypes = getAllowedMimeTypes(uploadType);
    // Skip validation if allowed types is wildcard
    if (allowedTypes[0] !== "*/*") {
      const validation = validateFile(
        { size: file.size, type: file.type },
        allowedTypes
      );

      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const url = await uploadFile(
      buffer,
      file.name,
      file.type,
      uploadType
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          url,
          name: file.name,
          type: file.type,
          size: file.size,
        },
        message: "File uploaded successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Upload Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

