
import { VehicleData } from "@/components/fleet/VehicleCard";

export const sampleVehicles: VehicleData[] = [
  {
    id: "1",
    make: "Toyota",
    model: "Corolla",
    year: 2021,
    type: "Sedan",
    mileage: 32450,
    image: "https://images.unsplash.com/photo-1623013438264-d176fb91ee99?auto=format&fit=crop&q=80&w=1000",
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
    image: "https://images.unsplash.com/photo-1588949613920-509dca5984e5?auto=format&fit=crop&q=80&w=1000",
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
    image: "https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?auto=format&fit=crop&q=80&w=1000",
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
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=1000",
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
