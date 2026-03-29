import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ProfilePanel } from '../components/ProfilePanel';
import { mapErrorMessage } from '../lib/errors';
import { fetchProfile } from '../services/profile';
import type { Profile } from '../types/api';

export function MainLayout() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await fetchProfile();
      setProfile(data);
    } catch (e) {
      setProfileError(mapErrorMessage(e));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return (
    <div className="relative min-h-screen bg-[length:24px_24px] bg-grid-light dark:bg-grid-dark">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent dark:from-accent/10" />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 md:px-8 md:pb-24 md:pt-24">
        <div className="flex flex-col gap-10 md:flex-row md:gap-12 lg:gap-16">
          <aside className="shrink-0 md:w-72 lg:w-80">
            <div className="sticky top-24 rounded-3xl border border-border bg-surface-elevated/50 p-6 backdrop-blur-md md:p-8">
              <ProfilePanel
                profile={profile}
                loading={profileLoading}
                error={profileError}
                onRetry={loadProfile}
              />
            </div>
          </aside>
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
