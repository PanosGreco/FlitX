import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Country } from "country-state-city";

interface CountryComboboxProps {
  value: string; // ISO code
  onChange: (isoCode: string, name: string) => void;
  placeholder?: string;
}

const allCountries = Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name));

export function CountryCombobox({ value, onChange, placeholder = "Select country..." }: CountryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return allCountries;
    const q = search.toLowerCase();
    return allCountries.filter(c => c.name.toLowerCase().includes(q));
  }, [search]);

  const selected = value ? allCountries.find(c => c.isoCode === value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-10">
          {selected ? (
            <span className="truncate">{selected.flag} {selected.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search country..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {filtered.slice(0, 50).map((country) => (
                <CommandItem
                  key={country.isoCode}
                  value={country.isoCode}
                  onSelect={() => {
                    onChange(country.isoCode, country.name);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === country.isoCode ? "opacity-100" : "opacity-0")} />
                  {country.flag} {country.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
