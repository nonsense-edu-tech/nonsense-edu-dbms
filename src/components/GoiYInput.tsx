"use client";

import { useId } from "react";
import styles from "./Form.module.css";

// Ô nhập có danh sách gợi ý (datalist): chọn từ danh sách hoặc gõ tự do.
export default function GoiYInput({
  id,
  name,
  options,
  disabled,
  placeholder,
  defaultValue,
}: {
  id: string;
  name: string;
  options: readonly string[];
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  const listId = useId();
  return (
    <>
      <input
        id={id}
        name={name}
        type="text"
        list={listId}
        autoComplete="off"
        className={styles.input}
        disabled={disabled}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
