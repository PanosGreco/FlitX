import { cn } from '@/lib/utils';

interface VehicleTypeTagProps {
  type: string;
  className?: string;
}

export const VEHICLE_TAG_COLORS = [
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-lime-100 text-lime-700 border-lime-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  'bg-sky-100 text-sky-700 border-sky-200',
];

export const VEHICLE_HEX_COLORS = [
  '#06b6d4', '#6366f1', '#84cc16', '#f43f5e',
  '#8b5cf6', '#14b8a6', '#d946ef', '#0ea5e9',
];

export function hashVehicleType(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function colorForVehicleType(type: string): string {
  return VEHICLE_HEX_COLORS[hashVehicleType(type.toLowerCase()) % VEHICLE_HEX_COLORS.length];
}

export function VehicleTypeTag({ type, className }: VehicleTypeTagProps) {
  const style = VEHICLE_TAG_COLORS[hashVehicleType(type.toLowerCase()) % VEHICLE_TAG_COLORS.length];
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded border',
      style,
      className
    )}>
      {type}
    </span>
  );
}
