import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
    session: Session | null;
    user: User | null;
    isActive: boolean;
    role: 'user' | 'admin' | null;
    isLoading: boolean;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    isActive: false,
    role: null,
    isLoading: true,

    initialize: async () => {
        try {
            set({ isLoading: true });

            // Get initial session
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                set({
                    session,
                    user: session.user,
                    isLoading: false
                });
            } else {
                set({ session: null, user: null, isLoading: false });
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange((_event, session) => {
                set({
                    session,
                    user: session?.user ?? null,
                    isLoading: false
                });
            });
        } catch (error) {
            console.error('Auth initialization error:', error);
            set({ isLoading: false });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
    },
}));
