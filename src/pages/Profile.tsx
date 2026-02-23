
import { AppShell } from "@/components/layout/AppShell";
import { UserProfile } from "@/components/profile/UserProfile";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";

const Profile = () => {
  const { t, isLanguageLoading } = useLanguage();
  
  return (
    <AppShell>
      <div className="container py-6">
        {isLanguageLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
            <div className="mt-6">
              <Skeleton className="h-[400px] rounded-lg" />
            </div>
          </div>
        ) : (
          <UserProfile />
        )}
      </div>
    </AppShell>
  );
};

export default Profile;
