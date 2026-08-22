import { useState } from "react";
import { CoverPhoto } from "@/components/CoverPhoto";

export type MediaSlot = {
  url: string;
  kind: "image" | "video";
  preview?: string;
};

type Labels = {
  remove: string;
  noPhoto: string;
  urlLabel: string;
  urlPlaceholder: string;
  urlAdd: string;
  urlHelp?: string;
  urlExamplesTitle?: string;
  urlExamples?: string[];
  urlInvalid?: string;
};

function guessKind(url: string): "image" | "video" {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) ? "video" : "image";
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
  const [urlDraft, setUrlDraft] = useState("");
  const [invalid, setInvalid] = useState(false);

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

  return (
    <div className="space-y-3">
      {labels.urlHelp ? (
        <p className="rounded-[16px] border border-rule bg-paper px-4 py-3 text-sm text-muted">
          {labels.urlHelp}
        </p>
      ) : null}

      {labels.urlExamples?.length ? (
        <div className="rounded-[16px] bg-paper px-4 py-3 text-sm">
          <p className="font-medium text-ink">
            {labels.urlExamplesTitle || "Examples"}
          </p>
          <ul className="mt-2 space-y-1 text-muted">
            {labels.urlExamples.map((example) => (
              <li key={example} className="break-all font-mono text-xs">
                {example}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
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
            className="btn btn-primary min-h-11"
          >
            {labels.urlAdd}
          </button>
        </div>
        {invalid && labels.urlInvalid ? (
          <p className="text-sm text-sold">{labels.urlInvalid}</p>
        ) : null}
      </div>

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
