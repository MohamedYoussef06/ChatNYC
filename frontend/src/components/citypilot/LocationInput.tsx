"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { loadGoogleMapsLibrary } from "@/lib/google-maps";
import { googleMapsSearchUrl, locationSearchErrorMessage, resolveLocation, searchLocations, type Coordinates, type LocationSuggestion, type SelectedLocation } from "@/lib/location-suggestions";

type Props = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  origin: Coordinates;
  onChange: (value: string) => void;
  onSelect?: (location: SelectedLocation) => void;
  pinClassName?: string;
};

export function LocationInput({ id, label, value, placeholder, origin, onChange, onSelect, pinClassName = "text-[#0039a6]" }: Props) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error" | "selecting">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestRef = useRef(0);
  const listId = `${id}-suggestions`;
  const showDropdown = open && value.trim().length >= 3;

  useEffect(() => {
    if (!open || value.trim().length < 3) return;
    const request = ++requestRef.current;
    let cancelled = false;
    setStatus("loading");
    setErrorMessage("");
    setSuggestions([]);
    setActiveIndex(-1);
    const timer = window.setTimeout(async () => {
      try {
        const library = await loadGoogleMapsLibrary("places");
        if (cancelled || request !== requestRef.current) return;
        sessionRef.current ??= new library.AutocompleteSessionToken();
        const results = await searchLocations(library, value, { lat: origin.lat, lng: origin.lng }, sessionRef.current, () => !cancelled && request === requestRef.current);
        if (cancelled || request !== requestRef.current) return;
        setSuggestions(results);
        setStatus("ready");
      } catch (error) {
        if (!cancelled && request === requestRef.current) {
          setErrorMessage(locationSearchErrorMessage(error));
          setStatus("error");
        }
      }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [open, value, origin.lat, origin.lng]);

  useEffect(() => () => { requestRef.current += 1; }, []);

  async function selectSuggestion(suggestion: LocationSuggestion) {
    const request = ++requestRef.current;
    // Any new typing must start a new session while this selection resolves.
    sessionRef.current = null;
    setOpen(false);
    setStatus("selecting");
    setActiveIndex(-1);
    try {
      const selected = await resolveLocation(suggestion);
      if (request !== requestRef.current) return;
      onChange(selected.label);
      onSelect?.(selected);
      setSuggestions([]);
      setStatus("idle");
    } catch (error) {
      if (request === requestRef.current) {
        setErrorMessage(locationSearchErrorMessage(error));
        setStatus("error");
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      requestRef.current += 1;
      setOpen(false);
      setActiveIndex(-1);
    } else if (showDropdown && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      if (!suggestions.length) return;
      setActiveIndex((index) => event.key === "ArrowDown" ? (index + 1) % suggestions.length : (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && (showDropdown || status === "selecting")) {
      event.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) void selectSuggestion(suggestions[activeIndex]);
    }
  }

  return (
    <div className="relative min-w-0" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActiveIndex(-1); }
    }}>
      <label htmlFor={id} className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#62666b]">{label}</label>
      <div className="flex h-12 items-center gap-2.5 rounded-lg border border-[#d9dcd9] bg-white px-3 focus-within:border-[#0039a6] focus-within:ring-2 focus-within:ring-[#0039a6]/10">
        <Icon name="pin" size={17} className={`shrink-0 ${pinClassName}`} />
        <input
          id={id} required value={value} placeholder={placeholder} autoComplete="off" spellCheck={false}
          role="combobox" aria-autocomplete="list" aria-expanded={showDropdown} aria-controls={showDropdown ? listId : undefined}
          aria-activedescendant={showDropdown && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-describedby={`${id}-status`}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            requestRef.current += 1;
            setSuggestions([]);
            setActiveIndex(-1);
            setStatus("idle");
            setOpen(true);
            if (!event.target.value.trim()) sessionRef.current = null;
            onChange(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#191c1e] outline-none placeholder:text-[#858a8e]"
        />
      </div>
      <span id={`${id}-status`} role="status" className="sr-only">
        {status === "loading" ? "Searching locations" : status === "selecting" ? "Selecting location" : status === "ready" && open ? `${suggestions.length} suggestions. Use up and down arrows, then Enter to select.` : status === "error" ? errorMessage : ""}
      </span>
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-[#dce2ea] bg-white shadow-[0_12px_32px_rgba(21,23,25,0.16)]">
          <ul id={listId} role="listbox" aria-label={`${label} location suggestions`} aria-busy={status === "loading"} className="m-0 list-none p-0">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.id} id={`${id}-option-${index}`} role="option" aria-selected={activeIndex === index}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => void selectSuggestion(suggestion)}
                className={`flex cursor-pointer items-start gap-3 border-b border-[#eef0f2] px-3 py-3 text-left last:border-b-0 ${activeIndex === index ? "bg-[#eef3fb]" : "hover:bg-[#f7f9fc]"}`}>
                <Icon name="pin" size={16} className="mt-0.5 shrink-0 text-[#0039a6]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#191c1e]">{suggestion.name}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[#686e73]">{suggestion.address}</p>
                </div>
                {suggestion.distanceMeters !== undefined && <span className="shrink-0 pt-0.5 text-[10px] text-[#767b80]">{(suggestion.distanceMeters / 1609.344).toFixed(1)} mi</span>}
              </li>
            ))}
          </ul>
          {status === "loading" && <p className="px-4 py-4 text-xs text-[#686e73]">Searching locations…</p>}
          {status === "ready" && !suggestions.length && <p className="px-4 py-4 text-xs text-[#686e73]">No matches. Try adding a street or neighborhood.</p>}
          {status === "error" && (
            <div className="px-4 py-4">
              <p className="text-xs leading-5 text-[#686e73]">{errorMessage} You can still enter an address.</p>
              <a href={googleMapsSearchUrl(value)} target="_blank" rel="noopener noreferrer"
                onMouseDown={(event) => event.preventDefault()}
                className="mt-2 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#0039a6] underline underline-offset-4">
                Search “{value.trim()}” on Google Maps <Icon name="arrow-up-right" size={14} />
              </a>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-[#eef0f2] bg-[#fafbfc] px-3 py-2 text-[10px] text-[#767b80]">
            <span>NYC first · nearest matches</span><span className="shrink-0 font-medium">Google Maps</span>
          </div>
        </div>
      )}
      {!open && status === "error" && <p className="mt-1 text-xs text-[#686e73]">{errorMessage}</p>}
    </div>
  );
}
