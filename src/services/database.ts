import { supabase } from "../supabase";
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';

export interface UserProfile {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string;
}

export interface LibraryItem {
    id: string;
    episode_id: string;
    status: 'queue' | 'liked' | 'history' | 'downloaded';
    created_at: string;
    episode: {
        id: string;
        title: string;
        description: string;
        audio_url: string;
        image_url: string;
        pub_date: string;
        duration: string;
    };
}

export const DatabaseService = {
    // --- Helper ---
    getEpisodeIdFromUrl(audioUrl: string): string {
        if (!audioUrl) return `ep_${Date.now()}`;
        return audioUrl.split('/').pop()?.split('?')[0] || `ep_${Date.now()}`;
    },

    // --- Profiles ---
    async ensureUserProfile(userId: string, userEmail?: string, displayName?: string) {
        // Check if profile exists
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();

        if (existing) return; // Profile already exists

        // Create profile if it doesn't exist
        const { error } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email: userEmail || '',
                display_name: displayName || '',
                avatar_url: ''
            });

        if (error && !error.message.includes('duplicate key')) {
            // Error creating profile
        }
    },

    async getUserProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data as UserProfile;
    },

    async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async uploadAvatar(userId: string, imageUri: string, imageName: string) {
        try {

            // For React Native, we need to read the file properly using RNFS
            // Remove 'file://' prefix if present
            let filePath = imageUri;
            if (filePath.startsWith('file://')) {
                filePath = filePath.replace('file://', '');
            }

            // Read the file as base64
            const base64Data = await RNFS.readFile(filePath, 'base64');

            // Convert base64 to binary using Buffer (available in React Native via polyfill)
            const buffer = Buffer.from(base64Data, 'base64');

            // Upload to Supabase Storage
            const storagePath = `${userId}/${imageName}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(storagePath, buffer, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: 'image/jpeg'
                });

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(storagePath);

            const avatarUrl = urlData.publicUrl;

            // Verify the file exists by attempting to download it
            try {
                const { data: downloaded, error: downloadError } = await supabase.storage
                    .from('avatars')
                    .download(storagePath);

                if (downloadError) {
                    // Verification download failed
                } else {
                    // Verification successful
                }
            } catch (verErr) {
                // Verification threw error
            }

            // Update profile with new avatar URL
            await this.updateUserProfile(userId, { avatar_url: avatarUrl } as any);

            return avatarUrl;
        } catch (error) {
            throw error;
        }
    },

    // --- Episodes ---
    async upsertEpisode(episode: any) {
        const { error } = await supabase
            .from('episodes')
            .upsert({
                id: episode.id || episode.audioUrl, // Prefer explicit ID (e.g. safe filename)
                title: episode.title,
                description: episode.description,
                audio_url: episode.audioUrl,
                image_url: episode.image,
                pub_date: episode.pubDate,
                duration: episode.duration || '',
            }, { onConflict: 'id' });

        // Silently handle errors
    },

    // --- Library ---
    async addToLibrary(userId: string, episode: any, status: 'queue' | 'liked' | 'history' | 'downloaded') {
        try {
            // 0. Ensure user profile exists (non-blocking)
            this.ensureUserProfile(userId).catch(() => {
                // Error ensuring user profile
            });

            // 1. Ensure episode exists in episodes table
            await this.upsertEpisode(episode);

            // 2. Add to user_library
            const { error } = await supabase
                .from('user_library')
                .upsert({
                    user_id: userId,
                    episode_id: episode.id || episode.audioUrl,
                    status: status,
                    created_at: new Date().toISOString(),
                }, { onConflict: 'user_id, episode_id, status' });

            if (error) {
                // Error adding to library
            }
        } catch (err) {
            // Unexpected error in addToLibrary
        }
    },

    async removeFromLibrary(userId: string, episodeId: string, status: 'queue' | 'liked' | 'history' | 'downloaded') {
        const { error } = await supabase
            .from('user_library')
            .delete()
            .eq('user_id', userId)
            .eq('episode_id', episodeId)
            .eq('status', status);

        if (error) throw error;
    },

    async getLibrary(userId: string, status: 'queue' | 'liked' | 'history' | 'downloaded') {
        console.log(`Database: getLibrary-${status} starting...`);
        const start = Date.now();

        try {
            const { data, error } = await supabase
                .from('user_library')
                .select(`
                    *,
                    episode:episodes(*)
                `)
                .eq('user_id', userId)
                .eq('status', status)
                .order('created_at', { ascending: false });

            if (error) {
                return [];
            }

            return data as LibraryItem[];
        } catch (err) {
            return [];
        }
    },

    async getLibraryStats(userId: string) {
        const start = Date.now();
        const { count: likedCount, error: likedError } = await supabase
            .from('user_library')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'liked');

        // Mocking "following" for now as we don't have a following table yet
        const followingCount = 0;

        if (likedError) throw likedError;

        return {
            likedCount: likedCount || 0,
            followingCount
        };
    }
};
