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

async function uploadFile(file: File): Promise<MediaSlot> {
  const signResponse = await fetch("/api/v1/media/sign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name || `photo-${Date.now()}.jpg`,
      mime: file.type || "",
      size: file.size,
    }),
  });
  const signPayload = (await signResponse.json()) as {
    signedUrl?: string;
    token?: string;
    path?: string;
    publicUrl?: string;
    kind?: "image" | "video";
    error?: string;
  };
  if (
    !signResponse.ok ||
    !signPayload.signedUrl ||
    !signPayload.publicUrl ||
    !signPayload.token
  ) {
    throw new Error(signPayload.error || "upload failed");
  }

  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);

  const putResponse = await fetch(signPayload.signedUrl, {
    method: "PUT",
    headers: { "x-upsert": "true" },
    body,
  });
  if (!putResponse.ok) {
    // Fallback: some Supabase projects accept a raw binary PUT.
    const raw = await fetch(signPayload.signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true",
      },
      body: file,
    });
    if (!raw.ok) {
      throw new Error(`upload put ${putResponse.status}`);
    }
  }

  return {
    url: signPayload.publicUrl,
    kind: signPayload.kind ?? guessKindFromMime(file.type),
    preview: URL.createObjectURL(file),
  };
}

export function MediaPicker({
  items,
  onChange,
  labels,
}: {
  items: MediaSlot[];
  onChange: (items: MediaSlot[]) => void;
  labels: Labels;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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
    onChange([...items, { url, kind: guessKind(url) }]);
    setUrlDraft("");
  }

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError("");
    const next = [...items];
    try {
      for (const file of Array.from(fileList)) {
        const slot = await uploadFile(file);
        if (!next.some((entry) => entry.url === slot.url)) {
          next.push(slot);
        }
      }
      onChange(next);
    } catch {
      setError(labels.uploadError || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
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
        accept="image/*,video/*,.heic,.heif"
        multiple
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
