
import { MobileLayout } from "@/components/layout/MobileLayout";
import { UserProfile } from "@/components/profile/UserProfile";

const Profile = () => {
  return (
    <MobileLayout>
      <div className="container py-6">
        <UserProfile />
      </div>
    </MobileLayout>
  );
};

export default Profile;
