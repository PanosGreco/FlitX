
import { MobileLayout } from "@/components/layout/MobileLayout";
import { UserProfile } from "@/components/profile/UserProfile";
import { useLanguage } from "@/contexts/LanguageContext";

const Profile = () => {
  const { t } = useLanguage();
  
  return (
    <MobileLayout>
      <div className="container py-6">
        <UserProfile />
      </div>
    </MobileLayout>
  );
};

export default Profile;
