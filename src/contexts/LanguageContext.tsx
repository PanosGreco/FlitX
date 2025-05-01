import React, { createContext, useContext, useState } from 'react';

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
  ourFleet: string;
  addNewBoat: string;
  noBoats: string;
  noBoatsDesc: string;
  addYourFirstBoat: string;
  available: string;
  rented: string;
  maintenance: string;
  repair: string;
  myProfile: string;
  profileSubtitle: string;
  photoUpdated: string;
  photoUpdateSuccess: string;
  profileUpdated: string;
  profileUpdateSuccess: string;
  tabs: {
    account: string;
    security: string;
    settings: string;
  };
  personalInfo: {
    title: string;
    subtitle: string;
    uploadPhoto: string;
    photoRestriction: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    saving: string;
    saveChanges: string;
  };
  language: {
    title: string;
    subtitle: string;
    languageLabel: string;
    english: string;
    greek: string;
  };
  security: {
    title: string;
    subtitle: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    updatePassword: string;
    twoFactorTitle: string;
    twoFactorDescription: string;
  };
  notifications: {
    title: string;
    subtitle: string;
    emailNotifications: string;
    emailDescription: string;
    pushNotifications: string;
    pushDescription: string;
    maintenanceReminders: string;
    maintenanceDescription: string;
    bookingAlerts: string;
    bookingDescription: string;
  };
  dangerZone: {
    title: string;
    subtitle: string;
    signOutAll: string;
    signOutDescription: string;
    signOutButton: string;
    deleteAccount: string;
    deleteDescription: string;
    deleteButton: string;
  };
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
    welcomeBack: string;
  };
  marinaOverview: string;
  newBoatSlip: string;
  [key: string]: any;
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
  economy: "Económico",
  luxury: "Lujo",
  van: "Van",
  ourFleet: "Our Fleet",
  addNewBoat: "Add New Boat",
  noBoats: "No boats yet",
  noBoatsDesc: "Add your first boat to start managing your fleet",
  addYourFirstBoat: "Add Your First Boat",
  available: "Available",
  rented: "Rented Out",
  maintenance: "Maintenance",
  repair: "Needs Repair",
  myProfile: "My Profile",
  profileSubtitle: "Manage your personal information, account security and preferences",
  photoUpdated: "Profile Photo Updated",
  photoUpdateSuccess: "Your profile photo has been updated successfully",
  profileUpdated: "Profile Updated",
  profileUpdateSuccess: "Your profile has been updated successfully",
  tabs: {
    account: "Account",
    security: "Security",
    settings: "Settings"
  },
  personalInfo: {
    title: "Personal Information",
    subtitle: "Update your personal details",
    uploadPhoto: "Upload Photo",
    photoRestriction: "JPG or PNG, max 5MB",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    company: "Company",
    saving: "Saving...",
    saveChanges: "Save Changes"
  },
  language: {
    title: "Language Preferences",
    subtitle: "Choose your preferred language",
    languageLabel: "Language",
    english: "English",
    greek: "Greek"
  },
  security: {
    title: "Security Settings",
    subtitle: "Manage your account security",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    updatePassword: "Update Password",
    twoFactorTitle: "Two-Factor Authentication",
    twoFactorDescription: "Add an extra layer of security to your account"
  },
  notifications: {
    title: "Notification Preferences",
    subtitle: "Manage how you receive notifications",
    emailNotifications: "Email Notifications",
    emailDescription: "Receive important updates via email",
    pushNotifications: "Push Notifications",
    pushDescription: "Get alerts on your device",
    maintenanceReminders: "Maintenance Reminders",
    maintenanceDescription: "Receive reminders about vehicle maintenance",
    bookingAlerts: "Booking Alerts",
    bookingDescription: "Get notifications about new bookings"
  },
  dangerZone: {
    title: "Danger Zone",
    subtitle: "Manage account deletion and sign-out options",
    signOutAll: "Sign Out All Devices",
    signOutDescription: "Sign out from all sessions on all devices",
    signOutButton: "Sign Out All",
    deleteAccount: "Delete Account",
    deleteDescription: "Permanently delete your account and all associated data",
    deleteButton: "Delete Account"
  },
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
    login: "Log In",
    welcomeBack: "Welcome back to your dashboard"
  },
  marinaOverview: "Marina Overview",
  newBoatSlip: "New Slip"
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
  ourFleet: "Nuestra Flota",
  addNewBoat: "Añadir Nuevo Barco",
  noBoats: "No hay barcos todavía",
  noBoatsDesc: "Añade tu primer barco para comenzar a gestionar tu flota",
  addYourFirstBoat: "Añadir Tu Primer Barco",
  available: "Disponible",
  rented: "Alquilado",
  maintenance: "Mantenimiento",
  repair: "Necesita Reparación",
  myProfile: "Mi Perfil",
  profileSubtitle: "Gestione su información personal, seguridad de la cuenta y preferencias",
  photoUpdated: "Foto de Perfil Actualizada",
  photoUpdateSuccess: "Su foto de perfil ha sido actualizada con éxito",
  profileUpdated: "Perfil Actualizado",
  profileUpdateSuccess: "Su perfil ha sido actualizado con éxito",
  tabs: {
    account: "Cuenta",
    security: "Seguridad",
    settings: "Configuración"
  },
  personalInfo: {
    title: "Información Personal",
    subtitle: "Actualice sus datos personales",
    uploadPhoto: "Subir Foto",
    photoRestriction: "JPG o PNG, máx 5MB",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo Electrónico",
    phone: "Teléfono",
    company: "Empresa",
    saving: "Guardando...",
    saveChanges: "Guardar Cambios"
  },
  language: {
    title: "Preferencias de Idioma",
    subtitle: "Elija su idioma preferido",
    languageLabel: "Idioma",
    english: "Inglés",
    greek: "Griego"
  },
  security: {
    title: "Configuración de Seguridad",
    subtitle: "Gestione la seguridad de su cuenta",
    currentPassword: "Contraseña Actual",
    newPassword: "Nueva Contraseña",
    confirmPassword: "Confirmar Contraseña",
    updatePassword: "Actualizar Contraseña",
    twoFactorTitle: "Autenticación de Dos Factores",
    twoFactorDescription: "Añada una capa extra de seguridad a su cuenta"
  },
  notifications: {
    title: "Preferencias de Notificación",
    subtitle: "Gestione cómo recibe notificaciones",
    emailNotifications: "Notificaciones por Correo",
    emailDescription: "Reciba actualizaciones importantes por correo electrónico",
    pushNotifications: "Notificaciones Push",
    pushDescription: "Reciba alertas en su dispositivo",
    maintenanceReminders: "Recordatorios de Mantenimiento",
    maintenanceDescription: "Reciba recordatorios sobre el mantenimiento de vehículos",
    bookingAlerts: "Alertas de Reservas",
    bookingDescription: "Reciba notificaciones sobre nuevas reservas"
  },
  dangerZone: {
    title: "Zona de Peligro",
    subtitle: "Gestione la eliminación de la cuenta y las opciones de cierre de sesión",
    signOutAll: "Cerrar Sesión en Todos los Dispositivos",
    signOutDescription: "Cierre sesión de todas las sesiones en todos los dispositivos",
    signOutButton: "Cerrar Sesión en Todos",
    deleteAccount: "Eliminar Cuenta",
    deleteDescription: "Elimine permanentemente su cuenta y todos los datos asociados",
    deleteButton: "Eliminar Cuenta"
  },
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
    login: "Iniciar Sesión",
    welcomeBack: "Bienvenido de nuevo a tu panel"
  },
  marinaOverview: "Vista General de la Marina",
  newBoatSlip: "Nuevo Espacio"
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
