
import { VehicleDetails } from "@/components/fleet/VehicleDetails";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { sampleVehicles } from "@/lib/data";
import { useParams } from "react-router-dom";
import { isBoatBusiness } from "@/utils/businessTypeUtils";

const VehicleDetail = () => {
  const { id } = useParams();
  const businessType = isBoatBusiness() ? "Boat" : "Vehicle";
  
  return (
    <MobileLayout>
      <VehicleDetails vehicleId={id} vehicles={sampleVehicles} />
    </MobileLayout>
  );
};

export default VehicleDetail;
