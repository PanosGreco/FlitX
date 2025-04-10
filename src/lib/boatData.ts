
export interface BoatData {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  type: string;
  engineHours: number;
  image?: string;
  status: 'available' | 'rented' | 'maintenance' | 'repair';
  registrationNumber: string;
  fuelLevel: number;
  fuelType: string;
  fuelEfficiency: number;
  cruisingRange: number;
  length: number;
  capacity: number;
  dailyRate: number;
  lastServiceDate: string;
  serviceReminders: number;
  totalServices: number;
  engineCount: number;
  engineType: string;
  totalServiceCost: number;
  fuelCosts: number;
  usageHoursPerDay: number;
}

export const sampleBoats: BoatData[] = [
  {
    id: 'boat-1',
    name: 'Sea Breeze',
    make: 'Bayliner',
    model: 'Element E18',
    year: 2022,
    type: 'Deck Boat',
    engineHours: 125,
    image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
    status: 'available',
    registrationNumber: 'FL3842JK',
    fuelLevel: 85,
    fuelType: 'Gasoline',
    fuelEfficiency: 3.2, // gallons per hour
    cruisingRange: 150, // nautical miles
    length: 18, // feet
    capacity: 8, // people
    dailyRate: 250,
    lastServiceDate: '2023-02-15T00:00:00.000Z',
    serviceReminders: 1,
    totalServices: 3,
    engineCount: 1,
    engineType: 'Outboard',
    totalServiceCost: 850,
    fuelCosts: 450,
    usageHoursPerDay: 5
  },
  {
    id: 'boat-2',
    name: 'Ocean Explorer',
    make: 'Sea Ray',
    model: 'Sundancer 320',
    year: 2021,
    type: 'Cruiser',
    engineHours: 210,
    image: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
    status: 'rented',
    registrationNumber: 'CA9387LS',
    fuelLevel: 60,
    fuelType: 'Diesel',
    fuelEfficiency: 5.8, // gallons per hour
    cruisingRange: 280, // nautical miles
    length: 32, // feet
    capacity: 6, // people
    dailyRate: 550,
    lastServiceDate: '2023-04-10T00:00:00.000Z',
    serviceReminders: 0,
    totalServices: 4,
    engineCount: 2,
    engineType: 'Inboard',
    totalServiceCost: 1650,
    fuelCosts: 980,
    usageHoursPerDay: 4
  },
  {
    id: 'boat-3',
    name: 'Wave Runner',
    make: 'Boston Whaler',
    model: 'Montauk 190',
    year: 2023,
    type: 'Center Console',
    engineHours: 45,
    image: 'https://images.unsplash.com/photo-1569263900347-06b1e8c825ab?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
    status: 'available',
    registrationNumber: 'NY5621RT',
    fuelLevel: 95,
    fuelType: 'Gasoline',
    fuelEfficiency: 2.7, // gallons per hour
    cruisingRange: 180, // nautical miles
    length: 19, // feet
    capacity: 8, // people
    dailyRate: 320,
    lastServiceDate: '2023-05-22T00:00:00.000Z',
    serviceReminders: 0,
    totalServices: 1,
    engineCount: 1,
    engineType: 'Outboard',
    totalServiceCost: 350,
    fuelCosts: 280,
    usageHoursPerDay: 6
  },
  {
    id: 'boat-4',
    name: 'Coastal Cruiser',
    make: 'Chaparral',
    model: 'Suncoast 250',
    year: 2020,
    type: 'Deck Boat',
    engineHours: 320,
    status: 'maintenance',
    registrationNumber: 'FL1489ZX',
    fuelLevel: 40,
    fuelType: 'Gasoline',
    fuelEfficiency: 3.5, // gallons per hour
    cruisingRange: 160, // nautical miles
    length: 25, // feet
    capacity: 12, // people
    dailyRate: 290,
    lastServiceDate: '2023-01-15T00:00:00.000Z',
    serviceReminders: 2,
    totalServices: 5,
    engineCount: 1,
    engineType: 'Outboard',
    totalServiceCost: 1250,
    fuelCosts: 890,
    usageHoursPerDay: 5.5
  },
  {
    id: 'boat-5',
    name: 'Marina Star',
    make: 'Bennington',
    model: 'QX Sport 25',
    year: 2023,
    type: 'Pontoon',
    engineHours: 65,
    image: 'https://images.unsplash.com/photo-1560507074-b9eb74947ceb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1213&q=80',
    status: 'available',
    registrationNumber: 'GA7612JR',
    fuelLevel: 75,
    fuelType: 'Gasoline',
    fuelEfficiency: 2.9, // gallons per hour
    cruisingRange: 140, // nautical miles
    length: 25, // feet
    capacity: 14, // people
    dailyRate: 270,
    lastServiceDate: '2023-04-02T00:00:00.000Z',
    serviceReminders: 0,
    totalServices: 2,
    engineCount: 1,
    engineType: 'Outboard',
    totalServiceCost: 580,
    fuelCosts: 420,
    usageHoursPerDay: 4.5
  },
  {
    id: 'boat-6',
    name: 'Blue Horizon',
    make: 'Grady-White',
    model: 'Freedom 275',
    year: 2021,
    type: 'Dual Console',
    engineHours: 175,
    status: 'repair',
    registrationNumber: 'SC5532YT',
    fuelLevel: 20,
    fuelType: 'Gasoline',
    fuelEfficiency: 6.8, // gallons per hour
    cruisingRange: 210, // nautical miles
    length: 27, // feet
    capacity: 10, // people
    dailyRate: 420,
    lastServiceDate: '2023-03-18T00:00:00.000Z',
    serviceReminders: 1,
    totalServices: 3,
    engineCount: 2,
    engineType: 'Outboard',
    totalServiceCost: 920,
    fuelCosts: 1250,
    usageHoursPerDay: 6.5
  }
];
