
import { VehicleDetails } from "@/components/fleet/VehicleDetails";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { sampleVehicles } from "@/lib/data";

const VehicleDetail = () => {
  return (
    <MobileLayout>
      <VehicleDetails vehicles={sampleVehicles} />
    </MobileLayout>
  );
};

export default VehicleDetail;
