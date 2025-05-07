
import { VehicleData } from "@/components/fleet/VehicleCard";

export const sampleVehicles: VehicleData[] = [
  {
    id: "1",
    make: "Toyota",
    model: "Corolla",
    year: 2021,
    type: "Sedan",
    mileage: 32450,
    image: "https://images.unsplash.com/photo-1632183765415-7aeaf0ebe7f1?auto=format&fit=crop&q=80&w=1000",
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
    mileage: 45780,
    image: "https://images.unsplash.com/photo-1612393266591-c32944e815c8?auto=format&fit=crop&q=80&w=1000",
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
    mileage: 12350,
    image: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=1000",
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
    mileage: 28700,
    image: "https://images.unsplash.com/photo-1583356322882-85559b472f56?auto=format&fit=crop&q=80&w=1000",
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
    mileage: 67890,
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=1000",
    status: "repair",
    licensePlate: "JKL-7890",
    fuelLevel: 20,
    dailyRate: 85
  },
];
