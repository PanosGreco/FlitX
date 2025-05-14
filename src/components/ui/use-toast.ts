
import { useToast as useToastHook, toast as sonnerToast, type ToastT } from "sonner";

// Define variants for our toast types
const actionTypes = {
  default: {
    style: { backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" },
    className: "text-foreground bg-background", 
  },
  destructive: {
    style: { backgroundColor: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" },
    className: "text-destructive-foreground bg-destructive", 
  },
} as const;

// Define our own custom toast props type
export type ToastProps = ToastT & {
  variant?: keyof typeof actionTypes;
};

// Create a type without the id field for our toast function
type ToastPropsWithoutId = Omit<ToastProps, "id"> & {
  id?: string;
};

export interface ToastParameters extends ToastPropsWithoutId {}

// Our toast function will accept props without requiring an id
function toast({ variant = "default", ...props }: ToastPropsWithoutId) {
  const { style, className } = actionTypes[variant];

  // The sonnerToast function will automatically generate an id if one isn't provided
  return sonnerToast(props.title, {
    ...props,
    style,
    className,
  });
}

export { useToastHook as useToast, toast };
