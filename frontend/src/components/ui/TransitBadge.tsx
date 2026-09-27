const lineColors = {
  "1": "bg-[#d52e29] text-white",
  "4": "bg-[#008044] text-white",
  "5": "bg-[#008044] text-white",
  "6": "bg-[#008044] text-white",
  A: "bg-[#0039a6] text-white",
  C: "bg-[#0039a6] text-white",
  E: "bg-[#0039a6] text-white",
  B: "bg-[#ff6319] text-[#151719]",
  D: "bg-[#ff6319] text-[#151719]",
  F: "bg-[#ff6319] text-[#151719]",
  M: "bg-[#ff6319] text-[#151719]",
  N: "bg-[#fccc0a] text-[#151719]",
  Q: "bg-[#fccc0a] text-[#151719]",
  R: "bg-[#fccc0a] text-[#151719]",
  L: "bg-[#65676c] text-white",
  S: "bg-[#65676c] text-white",
} as const;

export type SubwayLine = keyof typeof lineColors;

export function TransitBadge({ line, small = false }: { line: SubwayLine; small?: boolean }) {
  return (
    <span aria-label={`${line} train`} className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none ${small ? "h-5 w-5 text-[11px]" : "h-7 w-7 text-sm"} ${lineColors[line]}`}>
      {line}
    </span>
  );
}
