"use client";

import React, { ChangeEvent } from "react";
import { convertToPinyin } from "@/lib/pinyin";
import { cn } from "@/lib/utils";

interface PinyinInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
}

export function PinyinInput({ className, value, onValueChange, onChange, ...props }: PinyinInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Attempt to convert numeric pinyin
    const original = e.target.value;
    const converted = convertToPinyin(original);
    
    // We override the event value to be the converted one
    // if the user provided an onChange.
    if (onChange) {
      e.target.value = converted;
      onChange(e);
    }
    
    if (onValueChange) {
      onValueChange(converted);
    }
  };

  return (
    <input
      {...props}
      value={value}
      onChange={handleChange}
      className={cn(
        "w-full outline-none",
        className
      )}
    />
  );
}
