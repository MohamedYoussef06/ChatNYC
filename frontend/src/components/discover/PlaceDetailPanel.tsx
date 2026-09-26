"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { TransitBadge } from "@/components/ui/TransitBadge";
import type { Recommendation } from "@/lib/recommendations";

export function PlaceDetailPanel({ place, saved, onClose, onSave }: {
  place: Recommendation | null;
  saved: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (place && dialog && !dialog.open) dialog.showModal();
    if (!place && dialog?.open) dialog.close();
  }, [place]);

  if (!place) return <dialog ref={dialogRef} aria-label="Place details" onClose={onClose} />;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="discover-place-title"
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border-0 bg-white p-0 text-[#151719] shadow-2xl backdrop:bg-black/45 sm:inset-0 sm:m-auto sm:max-h-[90dvh] sm:max-w-xl sm:rounded-2xl"
    >
      <div className="relative aspect-[1.9] bg-[#e9e9e4]">
        <Image src={place.image} alt={place.imageAlt} fill sizes="(max-width: 639px) 100vw, 576px" className="object-cover" />
        <button type="button" autoFocus onClick={() => dialogRef.current?.close()} aria-label="Close place details" className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-white text-[#151719] shadow-md"><Icon name="close" size={19} /></button>
      </div>
      <div className="p-5 sm:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0039a6]">{place.category}</p>
        <h2 id="discover-place-title" className="mt-1.5 text-2xl font-semibold leading-tight tracking-[-0.04em] sm:text-[1.85rem]">{place.title}</h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-[#62666b]"><Icon name="pin" size={15} className="text-[#0039a6]" />{place.neighborhood}, {place.borough}</p>
        <p className="mt-4 text-sm leading-6 text-[#52585d]">{place.description}</p>

        <div className="my-5 space-y-3 border-y border-[#e4e5e2] py-4 text-xs text-[#50565b]">
          <div className="flex flex-wrap items-center gap-2"><span className="mr-1 font-semibold">Nearby subway</span>{place.lines?.map((line) => <TransitBadge key={line} line={line} small />)}<span>{place.station}</span></div>
          <p className="flex items-center gap-2"><Icon name="walk" size={16} className="text-[#62666b]" />{place.walk}<span aria-hidden="true">·</span>{place.away}</p>
          {place.price && <p className="flex items-center gap-2"><Icon name="bookmark" size={15} className="text-[#62666b]" />Price guide: {place.price}</p>}
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2.5">
          <button type="button" onClick={onSave} aria-pressed={saved} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d9dcd9] px-4 text-sm font-semibold text-[#30353a] hover:bg-[#f4f5f2]">
            <Icon name={saved ? "check" : "bookmark"} size={17} />{saved ? "Saved" : "Save"}
          </button>
          <Link href="/navigate" onClick={() => dialogRef.current?.close()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0039a6] px-4 text-center text-sm font-semibold text-white transition-colors hover:bg-[#002d85]">
            Get me there with CityPilot <Icon name="arrow-right" size={17} />
          </Link>
        </div>
        <p className="mt-3 text-center text-[10px] leading-4 text-[#74797d]">Place details and travel estimates are sample data.</p>
      </div>
    </dialog>
  );
}
