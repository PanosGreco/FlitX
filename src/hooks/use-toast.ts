
import { toast as sonnerToast, type ToastT } from "sonner";

type ToasterToast = ToastT;

const actionTypes = {
  default: {
    style: { backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" },
    descriptionStyle: { color: "hsl(var(--muted-foreground))" },
  },
  destructive: {
    style: { backgroundColor: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" },
    descriptionStyle: { color: "hsl(var(--destructive-foreground))" },
  },
} as const;

type ToastActionType = keyof typeof actionTypes;

type ToastProps = ToasterToast & {
  variant?: ToastActionType;
};

function toast({ variant = "default", ...props }: ToastProps) {
  const { style, descriptionStyle } = actionTypes[variant];

  return sonnerToast(props.title, {
    ...props,
    style,
    descriptionStyle,
  });
}

export { toast, type ToastProps as ToastParameters };
export const useToast = () => {
  return { 
    toast,
    toasts: [] // Add this to fix the toaster component expecting toasts property
  };
};
