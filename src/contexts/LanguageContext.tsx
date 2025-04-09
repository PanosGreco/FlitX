import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Define all translations for the application
export const translations = {
  en: {
    // Navigation
    fleet: "Fleet",
    finances: "Income & Expenses",
    tracking: "Live Tracking",
    profile: "Profile",
    
    // Fleet section
    addVehicle: "Add Vehicle",
    searchVehicles: "Search vehicles...",
    noVehicles: "No vehicles found. Add your first vehicle to get started.",
    noSearchResults: "No vehicles match your search criteria.",
    vehicleAdded: "Vehicle Added",
    vehicleAddedDesc: "New vehicle has been added to your fleet",
    addNewVehicle: "Add New Vehicle",
    enterVehicleDetails: "Enter the details for the new vehicle.",
    make: "Make",
    model: "Model",
    year: "Year",
    type: "Type",
    licensePlate: "License Plate",
    dailyRate: "Daily Rate ($)",
    mileage: "Current Mileage",
    vehicleTypes: "Vehicle Types",
    sedan: "Sedan",
    suv: "SUV",
    economy: "Economy",
    luxury: "Luxury",
    van: "Van",
    adding: "Adding...",
    add: "Add",
    cancel: "Cancel",
    uploadPhoto: "Upload Photo",
    photoRestrictions: "JPG, GIF or PNG. Max size of 800K",
    
    // Vehicle statuses
    available: "Available",
    rented: "Rented",
    maintenance: "Maintenance",
    repair: "Needs Repair",
    
    // Vehicle details
    editStatus: "Edit Status",
    selectStatus: "Select Status",
    save: "Save",
    saving: "Saving...",
    statusUpdated: "Status Updated",
    vehicleStatusChanged: "Vehicle status changed to",
    overview: "Overview",
    performance: "Performance",
    finance: "Finance",
    documents: "Documents",
    bookings: "Bookings",
    editFinance: "Edit Finance",
    enterFinanceDetails: "Enter financial details for this vehicle.",
    totalRevenue: "Total Revenue",
    totalExpenses: "Total Expenses",
    netProfit: "Net Profit",
    financeUpdated: "Finance Updated",
    financeDetailsUpdated: "Financial details have been updated",
    currentMileage: "Current Mileage",
    fuelLevel: "Fuel Level",
    serviceHistory: "Service History",
    rentalHistory: "Rental History",
    uploadDocuments: "Upload Documents",
    selectFiles: "Select Files",
    availability: "Availability",
    selectDays: "Select days when the vehicle is rented/unavailable.",
    rentalIncomeAdded: "Rental Income Added",
    addedIncome: "Added $",
    toIncomeFor: "to income for",
    documentUploaded: "Document Uploaded",
    documentSaved: "Document has been saved successfully",

    // Finance section
    addRecord: "Add Record",
    thisMonth: "This Month",
    last3Months: "Last 3 Months",
    last6Months: "Last 6 Months",
    thisYear: "This Year",
    all: "All",
    addTransaction: "Add Transaction",
    enterTransactionDetails: "Enter the details for the transaction.",
    transactionType: "Transaction Type",
    income: "Income",
    expense: "Expense",
    amount: "Amount",
    category: "Category",
    expenseCategories: "Expense Categories",
    fuel: "Fuel",
    vehicleMaintenance: "Vehicle Maintenance",
    carWash: "Car Wash",
    employeeSalaries: "Employee Salaries",
    other: "Other",
    incomeCategories: "Income Categories",
    rental: "Rental",
    insurance: "Insurance",
    sale: "Sale",
    notes: "Notes (Optional)",
    transactionAdded: "Transaction Added",
    transactionAddedDesc: "Your transaction has been recorded",
    
    // Common
    error: "Error",
    copied: "Copied to clipboard",
    copiedToClipboard: "Copied to clipboard",
    
    // Profile
    myProfile: "My Profile",
    profileSubtitle: "Manage your account settings and preferences",
    tabs: {
      account: "Account",
      security: "Security",
      settings: "Settings",
    },
    personalInfo: {
      title: "Profile Information",
      subtitle: "Update your personal information",
      uploadPhoto: "Upload Photo",
      photoRestriction: "JPG, GIF or PNG. Max size of 800K",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      phone: "Phone",
      company: "Company Name",
      saveChanges: "Save Changes",
      saving: "Saving...",
    },
    security: {
      title: "Password & Authentication",
      subtitle: "Update your password and security settings",
      currentPassword: "Current Password",
      newPassword: "New Password",
      confirmPassword: "Confirm New Password",
      updatePassword: "Update Password",
      twoFactorTitle: "Two-Factor Authentication",
      twoFactorDescription: "Add an extra layer of security to your account",
    },
    notifications: {
      title: "Notifications",
      subtitle: "Configure how you receive notifications",
      emailNotifications: "Email Notifications",
      emailDescription: "Receive email notifications for important updates",
      pushNotifications: "Push Notifications",
      pushDescription: "Receive push notifications on your mobile device",
      maintenanceReminders: "Maintenance Reminders",
      maintenanceDescription: "Get notified when vehicles need service",
      bookingAlerts: "Booking Alerts",
      bookingDescription: "Get notified for new bookings and cancellations",
    },
    dangerZone: {
      title: "Danger Zone",
      subtitle: "Actions here can't be undone",
      signOutAll: "Sign out of all devices",
      signOutDescription: "Log out from all devices where you're currently signed in",
      deleteAccount: "Delete account",
      deleteDescription: "Permanently delete your account and all your data",
      signOutButton: "Sign Out All",
      deleteButton: "Delete Account",
    },
    language: {
      title: "Language Settings",
      subtitle: "Change your preferred language",
      languageLabel: "Interface Language",
      english: "English",
      greek: "Greek",
    },
    profileUpdated: "Profile Updated",
    profileUpdateSuccess: "Your profile information has been saved",
    photoUpdated: "Profile Photo Updated",
    photoUpdateSuccess: "Your profile photo has been updated successfully",
    languageUpdated: "Language Updated",
    languageUpdateSuccess: "Your language preference has been set to English",

    // Sign Up
    signup: {
      createAccount: "Create your account",
      getStarted: "Sign up to get started with our rental management software",
      businessName: "Business Name",
      enterBusinessName: "Enter your business name",
      email: "Email Address",
      enterEmail: "Enter your email address",
      password: "Password",
      enterPassword: "Enter your password",
      businessType: "Business Type",
      selectBusinessType: "Select your business type",
      carRental: "Car Rental Business",
      boatRental: "Boat Rental Business",
      signUp: "Sign Up",
      alreadyHaveAccount: "Already have an account?",
      login: "Log in",
      passwordWeak: "Weak",
      passwordMedium: "Medium",
      passwordStrong: "Strong",
      accountCreated: "Account created successfully!",
      errorCreating: "Error creating account. Please try again.",
      businessNameRequired: "Business name is required",
      invalidEmail: "Please enter a valid email address",
      passwordLength: "Password must be at least 6 characters",
      businessTypeRequired: "Please select your business type"
    }
  },
  el: {
    // Navigation
    fleet: "Στόλος",
    finances: "Έσοδα & Έξοδα",
    tracking: "Ζωντανή Παρακολούθηση",
    profile: "Προφίλ",
    
    // Fleet section
    addVehicle: "Προσθήκη Οχήματος",
    searchVehicles: "Αναζήτηση οχημάτων...",
    noVehicles: "Δεν βρέθηκαν οχήματα. Προσθέστε το πρώτο σας όχημα για να ξεκινήσετε.",
    noSearchResults: "Κανένα όχημα δεν ταιριάζει με τα κριτήρια αναζήτησής σας.",
    vehicleAdded: "Το Όχημα Προστέθηκε",
    vehicleAddedDesc: "Το νέο όχημα έχει προστεθεί στο στόλο σας",
    addNewVehicle: "Προσθήκη Νέου Οχήματος",
    enterVehicleDetails: "Εισάγετε τα στοιχεία για το νέο όχημα.",
    make: "Μάρκα",
    model: "Μοντέλο",
    year: "Έτος",
    type: "Τύπος",
    licensePlate: "Αριθμός Πινακίδας",
    dailyRate: "Ημερήσιο Κόστος (€)",
    mileage: "Τρέχων Χιλιομετρητής",
    vehicleTypes: "Τύποι Οχημάτων",
    sedan: "Sedan",
    suv: "SUV",
    economy: "Οικονομικό",
    luxury: "Πολυτελείας",
    van: "Φορτηγό",
    adding: "Προσθήκη...",
    add: "Προσθήκη",
    cancel: "Ακύρωση",
    uploadPhoto: "Μεταφόρτωση Φωτογραφίας",
    photoRestrictions: "JPG, GIF ή PNG. Μέγιστο μέγεθος 800K",
    
    // Vehicle statuses
    available: "Διαθέσιμο",
    rented: "Ενοικιασμένο",
    maintenance: "Συντήρηση",
    repair: "Χρειάζεται Επισκευή",
    
    // Vehicle details
    editStatus: "Επεξεργασία Κατάστασης",
    selectStatus: "Επιλέξτε Κατάσταση",
    save: "Αποθήκευση",
    saving: "Αποθήκευση...",
    statusUpdated: "Κατάσταση Ενημερώθηκε",
    vehicleStatusChanged: "Η κατάσταση του οχήματος άλλαξε σε",
    overview: "Επισκόπηση",
    performance: "Απόδοση",
    finance: "Οικονομικά",
    documents: "Έγγραφα",
    bookings: "Κρατήσεις",
    editFinance: "Επεξεργασία Οικονομικών",
    enterFinanceDetails: "Εισάγετε οικονομικά στοιχεία για αυτό το όχημα.",
    totalRevenue: "Συνολικά Έσοδα",
    totalExpenses: "Συνολικά Έξοδα",
    netProfit: "Καθαρό Κέρδος",
    financeUpdated: "Οικονομικά Ενημερώθηκαν",
    financeDetailsUpdated: "Τα οικονομικά στοιχεία έχουν ενημερωθεί",
    currentMileage: "Τρέχων Χιλιομετρητής",
    fuelLevel: "Επίπεδο Καυσίμου",
    serviceHistory: "Ιστορικό Συντήρησης",
    rentalHistory: "Ιστορικό Ενοικιάσεων",
    uploadDocuments: "Μεταφόρτωση Εγγράφων",
    selectFiles: "Επιλογή Αρχείων",
    availability: "Διαθεσιμότητα",
    selectDays: "Επιλέξτε ημέρες που το όχημα είναι ενοικιασμένο/μη διαθέσιμο.",
    rentalIncomeAdded: "Προστέθηκε Έσοδο Ενοικίασης",
    addedIncome: "Προστέθηκαν €",
    toIncomeFor: "στα έσοδα για",
    documentUploaded: "Έγγραφο Μεταφορτώθηκε",
    documentSaved: "Το έγγραφο αποθηκεύτηκε επιτυχώς",

    // Finance section
    addRecord: "Προσθήκη Εγγραφής",
    thisMonth: "Αυτός ο Μήνας",
    last3Months: "Τελευταίοι 3 Μήνες",
    last6Months: "Τελευταίοι 6 Μήνες",
    thisYear: "Φέτος",
    all: "Όλα",
    addTransaction: "Προσθήκη Συναλλαγής",
    enterTransactionDetails: "Εισάγετε τα στοιχεία για τη συναλλαγή.",
    transactionType: "Τύπος Συναλλαγής",
    income: "Έσοδο",
    expense: "Έξοδο",
    amount: "Ποσό",
    category: "Κατηγορία",
    expenseCategories: "Κατηγορίες Εξόδων",
    fuel: "Καύσιμα",
    vehicleMaintenance: "Συντήρηση Οχήματος",
    carWash: "Πλύσιμο Αυτοκινήτου",
    employeeSalaries: "Μισθοί Υπαλλήλων",
    other: "Άλλο",
    incomeCategories: "Κατηγορίες Εσόδων",
    rental: "Ενοικίαση",
    insurance: "Ασφάλεια",
    sale: "Πώληση",
    notes: "Σημειώσεις (Προαιρετικό)",
    transactionAdded: "Η Συναλλαγή Προστέθηκε",
    transactionAddedDesc: "Η συναλλαγή σας έχει καταγραφεί",
    
    // Common
    error: "Σφάλμα",
    copied: "Αντιγράφηκε",
    copiedToClipboard: "Αντιγράφηκε στο πρόχειρο",
    
    // Profile
    myProfile: "Το Προφίλ μου",
    profileSubtitle: "Διαχειριστείτε τις ρυθμίσεις και τις προτιμήσεις του λογαριασμού σας",
    tabs: {
      account: "Λογαριασμός",
      security: "Ασφάλεια",
      settings: "Ρυθμίσεις",
    },
    personalInfo: {
      title: "Πληροφορίες Προφίλ",
      subtitle: "Ενημερώστε τα προσωπικά σας στοιχεία",
      uploadPhoto: "Μεταφόρτωση Φωτογραφίας",
      photoRestriction: "JPG, GIF ή PNG. Μέγιστο μέγεθος 800K",
      firstName: "Όνομα",
      lastName: "Επώνυμο",
      email: "Email",
      phone: "Τηλέφωνο",
      company: "Όνομα Εταιρείας",
      saveChanges: "Αποθήκευση Αλλαγών",
      saving: "Αποθήκευση...",
    },
    security: {
      title: "Κωδικός & Αυθεντικοποίηση",
      subtitle: "Ενημερώστε τον κωδικό και τις ρυθμίσεις ασφαλείας σας",
      currentPassword: "Τρέχων Κωδικός",
      newPassword: "Νέος Κωδικός",
      confirmPassword: "Επιβεβαίωση Νέου Κωδικού",
      updatePassword: "Ενημέρωση Κωδικού",
      twoFactorTitle: "Έλεγχος Ταυτότητας Δύο Παραγόντων",
      twoFactorDescription: "Προσθέστε ένα επιπλέον επίπεδο ασφάλειας στο λογαριασμό σας",
    },
    notifications: {
      title: "Ειδοποιήσεις",
      subtitle: "Ρυθμίστε πώς λαμβάνετε ειδοποιήσεις",
      emailNotifications: "Ειδοποιήσεις Email",
      emailDescription: "Λάβετε ειδοποιήσεις email για σημαντικές ενημερώσεις",
      pushNotifications: "Push Ειδοποιήσεις",
      pushDescription: "Λάβετε push ειδοποιήσεις στην κινητή συσκευή σας",
      maintenanceReminders: "Υπενθυμίσεις Συντήρησης",
      maintenanceDescription: "Λάβετε ειδοποιήσεις όταν τα οχήματα χρειάζονται σέρβις",
      bookingAlerts: "Ειδοποιήσεις Κρατήσεων",
      bookingDescription: "Λάβετε ειδοποιήσεις για νέες κρατήσεις και ακυρώσεις",
    },
    dangerZone: {
      title: "Ζώνη Κινδύνου",
      subtitle: "Οι ενέργειες εδώ δεν μπορούν να αναιρεθούν",
      signOutAll: "Αποσύνδεση από όλες τις συσκευές",
      signOutDescription: "Αποσυνδεθείτε από όλες τις συσκευές όπου είστε συνδεδεμένοι",
      deleteAccount: "Διαγραφή λογαριασμού",
      deleteDescription: "Διαγράψτε μόνιμα τον λογαριασμό σας και όλα τα δεδομένα σας",
      signOutButton: "Αποσύνδεση Όλων",
      deleteButton: "Διαγραφή Λογαριασμού",
    },
    language: {
      title: "Ρυθμίσεις Γλώσσας",
      subtitle: "Αλλάξτε την προτιμώμενη γλώσσα σας",
      languageLabel: "Γλώσσα Διεπαφής",
      english: "Αγγλικά",
      greek: "Ελληνικά",
    },
    profileUpdated: "Το Προφίλ Ενημερώθηκε",
    profileUpdateSuccess: "Οι πληροφορίες του προφίλ σας αποθηκεύτηκαν",
    photoUpdated: "Η Φωτογραφία Προφίλ Ενημερώθηκε",
    photoUpdateSuccess: "Η φωτογραφία προφίλ σας ενημερώθηκε με επιτυχία",
    languageUpdated: "Η Γλώσσα Ενημερώθηκε",
    languageUpdateSuccess: "Η προτίμηση γλώσσας σας έχει οριστεί στα Ελληνικά",

    // Sign Up
    signup: {
      createAccount: "Δημιουργία λογαριασμού",
      getStarted: "Εγγραφείτε για να ξεκινήσετε με το λογισμικό διαχείρισης ενοικιάσεων",
      businessName: "Όνομα Επιχείρησης",
      enterBusinessName: "Εισάγετε το όνομα της επιχείρησής σας",
      email: "Διεύθυνση Email",
      enterEmail: "Εισάγετε το email σας",
      password: "Κωδικός",
      enterPassword: "Εισάγετε τον κωδικό σας",
      businessType: "Τύπος Επιχείρησης",
      selectBusinessType: "Επιλέξτε τον τύπο της επιχείρησής σας",
      carRental: "Επιχείρηση Ενοικίασης Αυτοκινήτων",
      boatRental: "Επιχείρηση Ενοικίασης Σκαφών",
      signUp: "Εγγραφή",
      alreadyHaveAccount: "Έχετε ήδη λογαριασμό;",
      login: "Σύνδεση",
      passwordWeak: "Αδύναμος",
      passwordMedium: "Μέτριος",
      passwordStrong: "Ισχυρός",
      accountCreated: "Ο λογαριασμός δημιουργήθηκε με επιτυχία!",
      errorCreating: "Σφάλμα κατά τη δημιουργία λογαριασμού. Παρακαλώ δοκιμάστε ξανά.",
      businessNameRequired: "Το όνομα της επιχείρησης είναι υποχρεωτικό",
      invalidEmail: "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email",
      passwordLength: "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες",
      businessTypeRequired: "Παρακαλώ επιλέξτε τον τύπο της επιχείρησής σας"
    }
  }
};

type LanguageContextType = {
  language: "en" | "el";
  setLanguage: (lang: "en" | "el") => void;
  t: typeof translations.en;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<"en" | "el">("en");
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize language from localStorage on first render
  useEffect(() => {
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage === "el" || savedLanguage === "en") {
      setLanguageState(savedLanguage);
    }
    setIsInitialized(true);
  }, []);

  const setLanguage = (lang: "en" | "el") => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };
  
  // Current translations based on selected language
  const t = translations[language];
  
  // Only render children after we've checked localStorage for language preference
  if (!isInitialized) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
