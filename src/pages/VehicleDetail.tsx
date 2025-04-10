
import { VehicleDetails } from "@/components/fleet/VehicleDetails";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { sampleVehicles } from "@/lib/data";
import { sampleBoats } from "@/lib/boatData";
import { useParams } from "react-router-dom";
import { isBoatBusiness, getBusinessTypeDisplayName } from "@/utils/businessTypeUtils";

const VehicleDetail = () => {
  const { id } = useParams();
  const isBoatMode = isBoatBusiness();
  const businessType = getBusinessTypeDisplayName();
  const vehicles = isBoatMode ? sampleBoats : sampleVehicles;
  
  return (
    <MobileLayout>
      <VehicleDetails 
        vehicleId={id} 
        vehicles={vehicles} 
        // Remove isBoatMode prop as it's not in the VehicleDetails interface
      />
    </MobileLayout>
  );
};

export default VehicleDetail;
