
import { toast as sonnerToast, type ToastT } from "sonner";

type ToasterToast = ToastT;

const actionTypes = {
  default: {
    style: { backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" },
    className: "text-foreground bg-background", // Added className as a fallback
  },
  destructive: {
    style: { backgroundColor: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" },
    className: "text-destructive-foreground bg-destructive", // Added className as a fallback
  },
} as const;

type ToastActionType = keyof typeof actionTypes;

// Create a type that omits the id from the ToastT type
type ToastPropsWithoutId = Omit<ToastT, 'id'> & {
  variant?: ToastActionType;
};

// Export this as ToastParameters for external use
type ToastParameters = ToastPropsWithoutId;

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

export { toast, type ToastParameters };
export const useToast = () => {
  return { 
    toast,
    toasts: [] // Add this to fix the toaster component expecting toasts property
  };
};
