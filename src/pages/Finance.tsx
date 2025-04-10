
import React from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { FinanceDashboard } from "@/components/finances/FinanceDashboard";
import { BoatFinanceDashboard } from "@/components/finances/BoatFinanceDashboard";
import { isBoatBusiness } from "@/utils/businessTypeUtils";
import { useToast } from "@/hooks/use-toast";

const Finance = () => {
  const { toast } = useToast();
  const isBoatMode = isBoatBusiness();

  const handleAddRecord = () => {
    toast({
      title: "Add Financial Record",
      description: "The add record form would open here.",
    });
  };

  return (
    <MobileLayout>
      <div className="container py-6">
        {isBoatMode ? (
          <BoatFinanceDashboard onAddRecord={handleAddRecord} />
        ) : (
          <FinanceDashboard onAddRecord={handleAddRecord} />
        )}
      </div>
    </MobileLayout>
  );
};

export default Finance;
