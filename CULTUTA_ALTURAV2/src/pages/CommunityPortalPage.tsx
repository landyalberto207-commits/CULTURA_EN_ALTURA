import { useEffect, useState } from 'react';

import CommunityExperience from '../sections/CommunityExperience';
import { supabase } from '@/lib/supabase';

type PortalProfile = {
  full_name: string | null;
  avatar_url: string | null;
};

interface CommunityPortalPageProps {
  currentUserId: string | null;
  onNavigate: (to: string, replace?: boolean) => void;
  sharedVideoId?: string | null;
}

const CommunityPortalPage = ({ currentUserId, onNavigate, sharedVideoId }: CommunityPortalPageProps) => {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!currentUserId) {
      setProfile(null);
      return;
    }

    let active = true;

    const loadProfile = async () => {
      setProfileLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', currentUserId)
        .maybeSingle();

      if (!active) return;
      setProfile((data as PortalProfile | null) || null);
      setProfileLoading(false);
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [currentUserId]);

  const displayName = profile?.full_name?.trim() || 'Usuario';
  const profileInitial = displayName.charAt(0).toUpperCase();

  return (
    <main className="relative min-h-screen bg-[#1a1510]">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#2C2416] via-[#1a1510] to-[#0f0d0a] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,228,181,0.04)_0%,transparent_60%)] pointer-events-none" />

      {/* Profile button */}
      <div className="fixed top-4 left-4 lg:left-6 z-50">
        <button
          onClick={() => onNavigate('/perfil')}
          className="group relative pl-1.5 pr-3 py-1.5 rounded-full border border-white/10 bg-black/30 backdrop-blur-xl hover:border-white/25 hover:bg-black/50 transition-all duration-300"
        >
          <div className="relative z-10 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border border-white/20 bg-white/10 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                profileInitial
              )}
            </div>
            <div className="text-left leading-tight">
              <p className="museo-body text-[11px] text-white/80 max-w-[110px] truncate">
                {profileLoading ? '...' : displayName}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Back button */}
      <div className="fixed top-4 right-4 lg:right-6 z-50">
        <button
          onClick={() => onNavigate('/')}
          className="px-4 py-2 rounded-full border border-white/10 bg-black/30 backdrop-blur-xl text-white/60 hover:text-white hover:border-white/25 hover:bg-black/50 transition-all duration-300 museo-label text-[9px] tracking-[0.15em]"
        >
          INICIO
        </button>
      </div>

      <div className="relative z-10 w-full pt-16 pb-8">
        <CommunityExperience
          currentUserId={currentUserId}
          initialVideoId={sharedVideoId || null}
          onViewProfile={(userId) => onNavigate(`/perfil/${userId}`)}
        />
      </div>
    </main>
  );
};

export default CommunityPortalPage;
