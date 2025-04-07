
import { MobileLayout } from "@/components/layout/MobileLayout";
import { FinanceDashboard } from "@/components/finances/FinanceDashboard";

const Finance = () => {
  return (
    <MobileLayout>
      <div className="container py-6">
        <FinanceDashboard />
      </div>
    </MobileLayout>
  );
};

export default Finance;
