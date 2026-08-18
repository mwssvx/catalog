"use client";

type CoverPhotoProps = {
  src?: string;
  alt: string;
  className?: string;
  sold?: boolean;
  soldLabel?: string;
  emptyLabel?: string;
};

export function CoverPhoto({
  src,
  alt,
  className = "",
  sold = false,
  soldLabel = "Sold",
  emptyLabel,
}: CoverPhotoProps) {
  return (
    <div className={`relative overflow-hidden rounded-[22px] bg-paper ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`h-full w-full object-cover ${sold ? "grayscale contrast-75" : ""}`}
        />
      ) : (
        <div className="flex h-full min-h-40 items-center justify-center px-4 text-center text-sm font-medium text-muted">
          {emptyLabel || alt}
        </div>
      )}
      {sold ? (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/30">
          <span className="rounded-[12px] bg-white px-3 py-1 text-sm font-semibold">
            {soldLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}
