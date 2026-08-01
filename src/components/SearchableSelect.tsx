"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./SearchableSelect.module.css";

export type SearchableSelectOption = { value: string; label: string };

function chuanHoa(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function SearchableSelect({
  id,
  name,
  options,
  value,
  onChange,
  placeholder = "— Tìm và chọn —",
  emptyText = "Không tìm thấy kết quả nào.",
  disabled = false,
  required = false,
}: {
  id?: string;
  name: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const chon = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = chuanHoa(query.trim());
    if (!q) return options;
    return options.filter((o) => chuanHoa(o.label).includes(q));
  }, [options, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function chonOption(o: SearchableSelectOption) {
    onChange(o.value);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtered[activeIndex];
      if (o) chonOption(o);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input type="hidden" name={name} value={value} required={required} readOnly />
      <input
        id={id}
        type="text"
        className={styles.input}
        placeholder={placeholder}
        disabled={disabled}
        value={open ? query : (chon?.label ?? "")}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={id ? `${id}-listbox` : undefined}
      />
      {open && (
        <div className={styles.panel} id={id ? `${id}-listbox` : undefined} role="listbox">
          {filtered.length === 0 ? (
            <div className={styles.empty}>{emptyText}</div>
          ) : (
            filtered.map((o, i) => (
              <div
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className={[
                  styles.option,
                  i === activeIndex ? styles.optionActive : "",
                  o.value === value ? styles.optionSelected : "",
                ].join(" ")}
                onMouseDown={(e) => {
                  e.preventDefault();
                  chonOption(o);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {o.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
