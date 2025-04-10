
import React, { createContext, useContext, useState } from 'react';

// First, let's make TypeScript happy by adding the missing translations
interface Translations {
  fleet: string;
  finances: string;
  tracking: string;
  profile: string;
  addVehicle: string;
  searchVehicles: string;
  noVehicles: string;
  noSearchResults: string;
  vehicleAdded: string;
  vehicleAddedDesc: string;
  make: string;
  model: string;
  year: string;
  type: string;
  licensePlate: string;
  dailyRate: string;
  mileage: string;
  cancel: string;
  adding: string;
  add: string;
  uploadPhoto: string;
  photoRestrictions: string;
  vehicleTypes: string;
  sedan: string;
  suv: string;
  economy: string;
  luxury: string;
  van: string;
  // Add boat-specific translations
  ourFleet: string;
  addNewBoat: string;
  noBoats: string;
  noBoatsDesc: string;
  addYourFirstBoat: string;
  available: string;
  rented: string;
  maintenance: string;
  repair: string;
  signup: {
    title: string;
    subtitle: string;
    passwordWeak: string;
    passwordMedium: string;
    passwordStrong: string;
    businessNameRequired: string;
    invalidEmail: string;
    passwordLength: string;
    businessTypeRequired: string;
    accountCreated: string;
    errorCreating: string;
    createAccount: string;
    getStarted: string;
    businessName: string;
    enterBusinessName: string;
    email: string;
    enterEmail: string;
    password: string;
    enterPassword: string;
    businessType: string;
    selectBusinessType: string;
    carRental: string;
    boatRental: string;
    signUp: string;
    alreadyHaveAccount: string;
    login: string;
  };
  [key: string]: any; // Allow for dynamic keys
}

const englishTranslations: Translations = {
  fleet: "Fleet",
  finances: "Finances",
  tracking: "Tracking",
  profile: "Profile",
  addVehicle: "Add Vehicle",
  searchVehicles: "Search Vehicles",
  noVehicles: "No vehicles",
  noSearchResults: "No search results",
  vehicleAdded: "Vehicle Added",
  vehicleAddedDesc: "The vehicle has been added to your fleet.",
  make: "Make",
  model: "Model",
  year: "Year",
  type: "Type",
  licensePlate: "License Plate",
  dailyRate: "Daily Rate",
  mileage: "Mileage",
  cancel: "Cancel",
  adding: "Adding...",
  add: "Add",
  uploadPhoto: "Upload Photo",
  photoRestrictions: "Photos must be JPG or PNG format, up to 5MB",
  vehicleTypes: "Vehicle Types",
  sedan: "Sedan",
  suv: "SUV",
  economy: "Economy",
  luxury: "Luxury",
  van: "Van",
  // Boat translations
  ourFleet: "Our Fleet",
  addNewBoat: "Add New Boat",
  noBoats: "No boats yet",
  noBoatsDesc: "Add your first boat to start managing your fleet",
  addYourFirstBoat: "Add Your First Boat",
  available: "Available",
  rented: "Rented Out",
  maintenance: "Maintenance",
  repair: "Needs Repair",
  signup: {
    title: "Sign Up",
    subtitle: "Create your FlitX account",
    passwordWeak: "Weak",
    passwordMedium: "Medium",
    passwordStrong: "Strong",
    businessNameRequired: "Business name is required",
    invalidEmail: "Invalid email address",
    passwordLength: "Password must be at least 6 characters",
    businessTypeRequired: "Business type is required",
    accountCreated: "Account created successfully!",
    errorCreating: "Error creating account. Please try again.",
    createAccount: "Create Account",
    getStarted: "Get started with your fleet management",
    businessName: "Business Name",
    enterBusinessName: "Enter your business name",
    email: "Email",
    enterEmail: "Enter your email address",
    password: "Password",
    enterPassword: "Create a password",
    businessType: "Business Type",
    selectBusinessType: "Select your business type",
    carRental: "Car Rental",
    boatRental: "Boat Rental",
    signUp: "Sign Up",
    alreadyHaveAccount: "Already have an account?",
    login: "Log In"
  },
};

const spanishTranslations: Translations = {
  fleet: "Flota",
  finances: "Finanzas",
  tracking: "Seguimiento",
  profile: "Perfil",
  addVehicle: "Añadir Vehículo",
  searchVehicles: "Buscar Vehículos",
  noVehicles: "No hay vehículos",
  noSearchResults: "No hay resultados",
  vehicleAdded: "Vehículo Añadido",
  vehicleAddedDesc: "El vehículo ha sido añadido a tu flota.",
  make: "Marca",
  model: "Modelo",
  year: "Año",
  type: "Tipo",
  licensePlate: "Matrícula",
  dailyRate: "Tarifa Diaria",
  mileage: "Kilometraje",
  cancel: "Cancelar",
  adding: "Añadiendo...",
  add: "Añadir",
  uploadPhoto: "Subir Foto",
  photoRestrictions: "Las fotos deben ser en formato JPG o PNG, hasta 5MB",
  vehicleTypes: "Tipos de Vehículos",
  sedan: "Sedán",
  suv: "SUV",
  economy: "Económico",
  luxury: "Lujo",
  van: "Furgoneta",
  // Boat translations
  ourFleet: "Nuestra Flota",
  addNewBoat: "Añadir Nuevo Barco",
  noBoats: "No hay barcos todavía",
  noBoatsDesc: "Añade tu primer barco para comenzar a gestionar tu flota",
  addYourFirstBoat: "Añadir Tu Primer Barco",
  available: "Disponible",
  rented: "Alquilado",
  maintenance: "Mantenimiento",
  repair: "Necesita Reparación",
  signup: {
    title: "Registrarse",
    subtitle: "Crea tu cuenta FlitX",
    passwordWeak: "Débil",
    passwordMedium: "Medio",
    passwordStrong: "Fuerte",
    businessNameRequired: "El nombre de la empresa es obligatorio",
    invalidEmail: "Dirección de correo electrónico inválida",
    passwordLength: "La contraseña debe tener al menos 6 caracteres",
    businessTypeRequired: "El tipo de negocio es obligatorio",
    accountCreated: "¡Cuenta creada con éxito!",
    errorCreating: "Error al crear la cuenta. Por favor, inténtelo de nuevo.",
    createAccount: "Crear Cuenta",
    getStarted: "Comienza con la gestión de tu flota",
    businessName: "Nombre de la Empresa",
    enterBusinessName: "Introduce el nombre de tu empresa",
    email: "Correo Electrónico",
    enterEmail: "Introduce tu dirección de correo electrónico",
    password: "Contraseña",
    enterPassword: "Crea una contraseña",
    businessType: "Tipo de Negocio",
    selectBusinessType: "Selecciona tu tipo de negocio",
    carRental: "Alquiler de Coches",
    boatRental: "Alquiler de Barcos",
    signUp: "Registrarse",
    alreadyHaveAccount: "¿Ya tienes una cuenta?",
    login: "Iniciar Sesión"
  },
};

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: englishTranslations,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState('en');
  const t = language === 'es' ? spanishTranslations : englishTranslations;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
