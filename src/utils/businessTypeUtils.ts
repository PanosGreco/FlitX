
// Store the current business type
export const setBusinessType = (type: "cars" | "boats") => {
  localStorage.setItem("businessType", type);
};

export const getBusinessType = (): "cars" | "boats" => {
  const type = localStorage.getItem("businessType");
  return type === "boats" ? "boats" : "cars";
};

export const isBoatBusiness = (): boolean => {
  return getBusinessType() === "boats";
};

// Business type display names
export const getBusinessTypeDisplayName = (type?: "cars" | "boats"): string => {
  const businessType = type || getBusinessType();
  return businessType === "boats" ? "Boat" : "Car";
};

// Vehicle type display name based on business type
export const getVehicleTypeDisplayName = (plural = false): string => {
  const businessType = getBusinessType();
  if (businessType === "boats") {
    return plural ? "Boats" : "Boat";
  }
  return plural ? "Vehicles" : "Vehicle";
};
