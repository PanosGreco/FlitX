
import { MobileLayout } from "@/components/layout/MobileLayout";
import { LiveTrackingMap } from "@/components/tracking/LiveTrackingMap";
import { Suspense } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";

const Tracking = () => {
  const { t, isLanguageLoading } = useLanguage();
  
  return (
    <MobileLayout>
      <div className="container py-6">
        {isLanguageLoading ? (
          <Skeleton className="h-[70vh] rounded-lg" />
        ) : (
          <Suspense fallback={
            <div className="flex justify-center items-center h-[70vh] bg-gray-50 rounded-lg">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flitx-blue mb-4"></div>
                <p className="text-flitx-gray-500">{t.loadingMap}</p>
              </div>
            </div>
          }>
            <LiveTrackingMap />
          </Suspense>
        )}
      </div>
    </MobileLayout>
  );
};

export default Tracking;
