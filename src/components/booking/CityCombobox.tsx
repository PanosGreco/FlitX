import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { City } from "country-state-city";

interface CityComboboxProps {
  countryCode: string;
  value: string;
  onChange: (cityName: string) => void;
  disabled?: boolean;
  placeholder?: string;
  disabledPlaceholder?: string;
  searchPlaceholder?: string;
}

export function CityCombobox({ countryCode, value, onChange, disabled, placeholder = "Select city...", disabledPlaceholder = "Select a country first", searchPlaceholder = "Type to search..." }: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allCities = useMemo(() => {
    if (!countryCode) return [];
    return City.getCitiesOfCountry(countryCode) || [];
  }, [countryCode]);

  const hasCityData = countryCode && allCities.length > 0;

  const filtered = useMemo(() => {
    if (!search.trim() || !hasCityData) return [];
    const q = search.toLowerCase();
    return allCities.filter(c => c.name.toLowerCase().includes(q)).slice(0, 50);
  }, [search, allCities, hasCityData]);

  // Fallback to plain input if country has no city data
  if (countryCode && !hasCityData) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  }

  if (disabled) {
    return (
      <Button variant="outline" disabled className="w-full justify-between font-normal h-10">
        <span className="text-muted-foreground">{disabledPlaceholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-10">
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            {!search.trim() ? (
              <div className="py-6 text-center text-sm text-muted-foreground">{searchPlaceholder}</div>
            ) : filtered.length === 0 ? (
              <CommandEmpty>No city found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((city, idx) => (
                  <CommandItem
                    key={`${city.name}-${city.stateCode}-${idx}`}
                    value={city.name}
                    onSelect={() => {
                      onChange(city.name);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === city.name ? "opacity-100" : "opacity-0")} />
                    {city.name}{city.stateCode ? ` (${city.stateCode})` : ""}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
