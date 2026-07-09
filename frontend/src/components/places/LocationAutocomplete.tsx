import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MapPin, Search } from "lucide-react";

import { autocompletePlaces, type AutocompleteSuggestion } from "@/api/places";
import { Input } from "@/components/ui/Input";

const DEBOUNCE_MS = 250;

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  inputClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  placeholder?: string;
  inputClassName?: string;
}) {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(() => {
      autocompletePlaces(value)
        .then((results) => {
          if (requestIdRef.current !== requestId) return; // a newer keystroke has already fired
          setSuggestions(results);
          setIsOpen(results.length > 0);
          setHighlightedIndex(-1);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions([]);
          setIsOpen(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (suggestion: AutocompleteSuggestion) => {
    onSelect(suggestion);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        className={`pl-9 ${inputClassName ?? ""}`}
      />

      {isOpen && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <li key={s.placeId ?? s.description}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // keep input focus so the click registers before blur
                onClick={() => handleSelect(s)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${
                  i === highlightedIndex ? "bg-brand-50 text-brand-700" : "hover:bg-slate-50"
                }`}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <span>
                  <span className="font-medium text-slate-900">{s.mainText}</span>
                  {s.secondaryText && (
                    <span className="text-slate-500"> — {s.secondaryText}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
