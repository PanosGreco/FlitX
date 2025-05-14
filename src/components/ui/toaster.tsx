
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <>
      <SonnerToaster position="bottom-right" />
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    </>
  )
}
