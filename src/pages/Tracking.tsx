
import { MobileLayout } from "@/components/layout/MobileLayout";
import { LiveTrackingMap } from "@/components/tracking/LiveTrackingMap";
import { Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";

const Tracking = () => {
  const { t } = useLanguage();
  
  return (
    <MobileLayout>
      <div className="container py-6">
        <Suspense fallback={<div className="flex justify-center p-8">{t.loadingMap}</div>}>
          <LiveTrackingMap />
        </Suspense>
      </div>
    </MobileLayout>
  );
};

export default Tracking;
