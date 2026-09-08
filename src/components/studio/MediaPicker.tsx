import { useRef, useState } from "react";
import { CoverPhoto } from "@/components/CoverPhoto";

export type MediaSlot = {
  url: string;
  kind: "image" | "video";
  preview?: string;
};

type Labels = {
  remove: string;
  noPhoto: string;
  addPhotos?: string;
  photoHint?: string;
  uploadProgress?: string;
  uploadError?: string;
  uploadPartial?: string;
  urlLabel: string;
  urlPlaceholder: string;
  urlAdd: string;
  urlHelp?: string;
  urlExamplesTitle?: string;
  urlExamples?: string[];
  urlInvalid?: string;
  urlOptional?: string;
};

function guessKind(url: string): "image" | "video" {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) ? "video" : "image";
}

function guessKindFromMime(mime: string): "image" | "video" {
  return mime.startsWith("video/") ? "video" : "image";
}

function isLikelyImage(file: File): boolean {
  if (file.type.startsWith("video/")) return false;
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || "");
}

async function preparePhoto(file: File): Promise<File> {
  if (!isLikelyImage(file) || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 2048;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (next) => (next ? resolve(next) : reject(new Error("jpeg"))),
        "image/jpeg",
        0.84,
      );
    });
    const base = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    if (!file.name || !file.name.includes(".")) {
      return new File([file], `photo-${Date.now()}.jpg`, {
        type: file.type || "image/jpeg",
      });
    }
    return file;
  }
}

async function uploadThroughApi(file: File): Promise<MediaSlot> {
  const ready = await preparePhoto(file);
  const form = new FormData();
  form.append("file", ready, ready.name);
  const response = await fetch("/api/v1/media/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const payload = (await response.json()) as {
    publicUrl?: string;
    kind?: "image" | "video";
    error?: string;
  };
  if (!response.ok || !payload.publicUrl) {
    throw new Error(payload.error || "upload failed");
  }
  return {
    url: payload.publicUrl,
    kind: payload.kind ?? guessKindFromMime(ready.type),
    preview: URL.createObjectURL(ready),
  };
}

export function MediaPicker({
  items,
  onChange,
  labels,
  maxFiles = 40,
}: {
  items: MediaSlot[];
  onChange: (items: MediaSlot[]) => void;
  labels: Labels;
  maxFiles?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const allowMany = maxFiles > 1;

  function addUrl() {
    const url = urlDraft.trim();
    if (!/^https?:\/\//i.test(url)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (items.some((slot) => slot.url === url)) {
      setUrlDraft("");
      return;
    }
    const next = [...items, { url, kind: guessKind(url) }];
    onChange(allowMany ? next.slice(0, maxFiles) : next.slice(-1));
    setUrlDraft("");
  }

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError("");
    const picked = Array.from(fileList);
    const room = Math.max(0, maxFiles - items.length);
    const files = allowMany ? picked.slice(0, room) : picked.slice(-1);
    const next = allowMany ? [...items] : [];
    let failed = 0;
    for (const file of files) {
      try {
        const slot = await uploadThroughApi(file);
        if (next.some((entry) => entry.url === slot.url)) continue;
        if (allowMany) next.push(slot);
        else next.splice(0, next.length, slot);
      } catch {
        failed += 1;
      }
    }
    onChange(next.slice(0, maxFiles));
    if (failed > 0 && next.length === items.length && allowMany) {
      setError(labels.uploadError || "Upload failed");
    } else if (failed > 0) {
      setError(
        labels.uploadPartial ||
          labels.uploadError ||
          "Some photos could not be uploaded",
      );
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      {labels.photoHint ? (
        <p className="text-sm text-muted">{labels.photoHint}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary min-h-11"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading
            ? labels.uploadProgress || "Uploading…"
            : labels.addPhotos || "Add photos"}
        </button>
        <button
          type="button"
          className="btn btn-secondary min-h-11"
          disabled={uploading}
          onClick={() => setShowLink((value) => !value)}
        >
          {labels.urlOptional || labels.urlLabel}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={allowMany}
        className="sr-only"
        onChange={(event) => void onFilesSelected(event.target.files)}
      />

      {error ? <p className="text-sm text-sold">{error}</p> : null}

      {showLink ? (
        <div className="space-y-2 rounded-[16px] border border-rule bg-paper px-4 py-3">
          {labels.urlHelp ? (
            <p className="text-sm text-muted">{labels.urlHelp}</p>
          ) : null}
          <span className="text-sm font-medium text-muted">{labels.urlLabel}</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={urlDraft}
              onChange={(event) => {
                setUrlDraft(event.target.value);
                if (invalid) setInvalid(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addUrl();
                }
              }}
              placeholder={labels.urlPlaceholder}
              className="field min-h-11 flex-1"
              inputMode="url"
            />
            <button
              type="button"
              onClick={addUrl}
              className="btn btn-secondary min-h-11"
            >
              {labels.urlAdd}
            </button>
          </div>
          {invalid && labels.urlInvalid ? (
            <p className="text-sm text-sold">{labels.urlInvalid}</p>
          ) : null}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {items.map((slot) => (
            <button
              key={slot.url}
              type="button"
              onClick={() =>
                onChange(items.filter((entry) => entry.url !== slot.url))
              }
              className="relative min-h-11 overflow-hidden rounded-[16px] border border-rule"
              title={labels.remove}
            >
              {slot.kind === "video" ? (
                <video
                  src={slot.preview ?? slot.url}
                  className="aspect-square w-full object-cover"
                  muted
                />
              ) : (
                <CoverPhoto
                  src={slot.preview ?? slot.url}
                  alt=""
                  className="aspect-square"
                  emptyLabel={labels.noPhoto}
                />
              )}
              <span className="absolute inset-x-1 bottom-1 rounded-[10px] bg-ink px-1 py-1 text-[11px] font-medium text-white">
                {labels.remove}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
