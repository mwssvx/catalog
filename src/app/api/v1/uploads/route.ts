import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isStudioAuthed, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

const IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export async function POST(request: Request) {
  if (!(await isStudioAuthed())) return unauthorized();

  const form = await request.formData();
  const files = form
    .getAll("files")
    .filter((value): value is File => value instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const uploaded: Array<{ url: string; kind: "image" | "video" }> = [];

  for (const file of files) {
    const isImage = IMAGE.has(file.type);
    const isVideo = VIDEO.has(file.type);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Use JPG, PNG, WebP, MP4 or WebM" },
        { status: 400 },
      );
    }
    const max = isVideo ? 40 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > max) {
      return NextResponse.json(
        { error: isVideo ? "Video must be under 40MB" : "Photo must be under 8MB" },
        { status: 400 },
      );
    }

    const ext =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "video/quicktime"
          ? "mov"
          : file.type.split("/")[1];
    const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadDir, name), bytes);
    uploaded.push({
      url: `/uploads/${name}`,
      kind: isVideo ? "video" : "image",
    });
  }

  return NextResponse.json({
    urls: uploaded.map((entry) => entry.url),
    files: uploaded,
  });
}
