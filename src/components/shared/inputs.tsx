"use client";
import { Input } from "@/components/ui/input";
import type { InputHTMLAttributes } from "react";

/** CurrencyInput / PercentageInput / DateInput — thin, typed wrappers over Input for consistent form fields across features. */

export function CurrencyInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input type="number" step="0.01" inputMode="decimal" {...props} />;
}

export function PercentageInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input type="number" step="0.01" inputMode="decimal" {...props} />;
}

export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input type="date" {...props} />;
}
