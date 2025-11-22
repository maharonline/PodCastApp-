import { supabase } from "../supabase";

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
            console.error('Error creating profile:', error);
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
            // Convert image to blob
            const response = await fetch(imageUri);
            const blob = await response.blob();

            // Upload to Supabase Storage
            const filePath = `avatars/${userId}/${imageName}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const avatarUrl = urlData.publicUrl;

            // Update profile with new avatar URL
            await this.updateUserProfile(userId, { avatar_url: avatarUrl } as any);

            return avatarUrl;
        } catch (error) {
            console.error("Error uploading avatar:", error);
            throw error;
        }
    },

    // --- Episodes ---
    async upsertEpisode(episode: any) {
        const { error } = await supabase
            .from('episodes')
            .upsert({
                id: episode.audioUrl || episode.id, // Use audioUrl as ID if no GUID
                title: episode.title,
                description: episode.description,
                audio_url: episode.audioUrl,
                image_url: episode.image,
                pub_date: episode.pubDate,
                duration: episode.duration || '',
            }, { onConflict: 'id' });

        if (error) console.error('Error upserting episode:', error);
    },

    // --- Library ---
    async addToLibrary(userId: string, episode: any, status: 'queue' | 'liked' | 'history' | 'downloaded') {
        // 0. Ensure user profile exists
        await this.ensureUserProfile(userId);

        // 1. Ensure episode exists in episodes table
        await this.upsertEpisode(episode);

        // 2. Add to user_library
        const { error } = await supabase
            .from('user_library')
            .upsert({
                user_id: userId,
                episode_id: episode.audioUrl || episode.id,
                status: status,
            }, { onConflict: 'user_id, episode_id, status' });

        if (error) throw error;
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

        const { data, error } = await supabase
            .from('user_library')
            .select(`
                *,
                episode:episodes(*)
            `)
            .eq('user_id', userId)
            .eq('status', status)
            .order('created_at', { ascending: false });

        console.log(`Database: getLibrary-${status} took ${Date.now() - start}ms. Rows: ${data?.length}`);

        if (error) throw error;
        return data as LibraryItem[];
    },

    async getLibraryStats(userId: string) {
        console.log(`Database: getLibraryStats starting...`);
        const start = Date.now();
        const { count: likedCount, error: likedError } = await supabase
            .from('user_library')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'liked');

        console.log(`Database: getLibraryStats took ${Date.now() - start}ms`);

        // Mocking "following" for now as we don't have a following table yet
        const followingCount = 0;

        if (likedError) throw likedError;

        return {
            likedCount: likedCount || 0,
            followingCount
        };
    }
};
