
import { VehicleData } from "@/components/fleet/VehicleCard";

export const sampleVehicles: VehicleData[] = [
  {
    id: "1",
    make: "Toyota",
    model: "Corolla",
    year: 2021,
    type: "Sedan",
    mileage: 52225, // Converted from miles to km (32450 mi)
    image: "/lovable-uploads/0f26dced-6cd1-4e89-b2a8-dcb3482cebd0.png",
    status: "available",
    licensePlate: "ABC-1234",
    fuelLevel: 75,
    dailyRate: 45
  },
  {
    id: "2",
    make: "Fiat",
    model: "Panda",
    year: 2020,
    type: "Economy",
    mileage: 73680, // Converted from miles to km (45780 mi)
    image: "/lovable-uploads/34e24d1f-45e1-4810-99d0-28e387b33412.png",
    status: "rented",
    licensePlate: "XYZ-5678",
    fuelLevel: 40,
    dailyRate: 35
  },
  {
    id: "3",
    make: "Honda",
    model: "Civic",
    year: 2022,
    type: "Sedan",
    mileage: 19876, // Converted from miles to km (12350 mi)
    image: "/lovable-uploads/0f89d525-68dc-4850-8e6c-cfa9aceb4073.png",
    status: "maintenance",
    licensePlate: "DEF-9012",
    fuelLevel: 90,
    dailyRate: 50
  },
  {
    id: "4",
    make: "Mercedes-Benz",
    model: "C-Class",
    year: 2021,
    type: "Luxury",
    mileage: 46192, // Converted from miles to km (28700 mi)
    image: "/lovable-uploads/8c2e1675-9d4a-4d70-99a5-487383795d64.png",
    status: "available",
    licensePlate: "GHI-3456",
    fuelLevel: 85,
    dailyRate: 95
  },
  {
    id: "5",
    make: "Ford",
    model: "Explorer",
    year: 2019,
    type: "SUV",
    mileage: 109268, // Converted from miles to km (67890 mi)
    image: "/lovable-uploads/01185989-2316-473a-bd69-3c49aeb9c82c.png",
    status: "repair",
    licensePlate: "JKL-7890",
    fuelLevel: 20,
    dailyRate: 85
  },
];
