
import { MobileLayout } from "@/components/layout/MobileLayout";
import { LiveTrackingMap } from "@/components/tracking/LiveTrackingMap";

const Tracking = () => {
  return (
    <MobileLayout>
      <div className="container py-6">
        <LiveTrackingMap />
      </div>
    </MobileLayout>
  );
};

export default Tracking;
