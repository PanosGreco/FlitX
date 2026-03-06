import { useState, useEffect } from "react";

const STORAGE_KEY = "fleetx_vat_rate";
const DEFAULT_VAT_RATE = 10;

export function useVatSettings() {
  const [vatRate, setVatRate] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseFloat(stored) : DEFAULT_VAT_RATE;
  });

  const saveVatRate = (rate: number) => {
    setVatRate(rate);
    localStorage.setItem(STORAGE_KEY, String(rate));
  };

  return { vatRate, setVatRate: saveVatRate };
}
