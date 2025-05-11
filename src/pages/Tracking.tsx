
import { MobileLayout } from "@/components/layout/MobileLayout";
import { LiveTrackingMap } from "@/components/tracking/LiveTrackingMap";
import { Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Tracking = () => {
  return (
    <MobileLayout>
      <div className="container py-6">
        <Suspense fallback={<div className="flex justify-center p-8">Loading map resources...</div>}>
          <LiveTrackingMap />
        </Suspense>
      </div>
    </MobileLayout>
  );
};

export default Tracking;
