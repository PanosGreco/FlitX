
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
