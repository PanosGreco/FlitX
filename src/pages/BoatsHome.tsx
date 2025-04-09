
import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import MobileLayout from "@/components/layout/MobileLayout";

const BoatsHome = () => {
  const { t } = useLanguage();

  return (
    <MobileLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Boat Rental Management</h1>
        <p className="text-gray-700 mb-4">
          Welcome to the boat rental management system. This is a customized version for boat rental businesses.
        </p>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Boat Fleet</h2>
          <p className="text-gray-600">
            No boats added yet. Add your first boat to get started with managing your boat rental business.
          </p>
          
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Add Your First Boat
          </button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default BoatsHome;
