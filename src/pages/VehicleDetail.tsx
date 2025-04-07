
import { VehicleDetails } from "@/components/fleet/VehicleDetails";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { sampleVehicles } from "@/lib/data";
import { useParams } from "react-router-dom";

const VehicleDetail = () => {
  const { id } = useParams();
  
  return (
    <MobileLayout>
      <VehicleDetails vehicleId={id} vehicles={sampleVehicles} />
    </MobileLayout>
  );
};

export default VehicleDetail;
