import { supabase } from '../supabase';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import { UserProfile, LibraryItem, Episode } from '../types';

export type { UserProfile, LibraryItem };

export const DatabaseService = {
  //===== Helper =====
  getEpisodeIdFromUrl(audioUrl: string): string {
    if (!audioUrl) return `ep_${Date.now()}`;
    return audioUrl.split('/').pop()?.split('?')[0] || `ep_${Date.now()}`;
  },

  //===== Ensure user profile =====
  async ensureUserProfile(
    userId: string,
    userEmail?: string,
    displayName?: string,
  ) {
    // Check if profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existing) return;


    const { error } = await supabase.from('profiles').insert({
      id: userId,
      email: userEmail || '',
      display_name: displayName || '',
      avatar_url: '',
    });


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

  //===== Update user profile =====
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
      let filePath = imageUri;
      if (filePath.startsWith('file://')) {
        filePath = filePath.replace('file://', '');
      }


      const base64Data = await RNFS.readFile(filePath, 'base64');

      const buffer = Buffer.from(base64Data, 'base64');

      const storagePath = `${userId}/${imageName}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, buffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(storagePath);

      const avatarUrl = urlData.publicUrl;

      try {
        const { error: downloadError } =
          await supabase.storage.from('avatars').download(storagePath);

        if (downloadError) {

        } else {

        }
      } catch (verErr) {

      }
      await this.updateUserProfile(userId, { avatar_url: avatarUrl });

      return avatarUrl;
    } catch (error) {
      throw error;
    }
  },

  // --- Episodes ---
  async upsertEpisode(episode: Episode) {
    const { error } = await supabase.from('episodes').upsert(
      {
        id: episode.id || episode.audioUrl,
        title: episode.title,
        description: episode.description,
        audio_url: episode.audioUrl,
        image_url: episode.image,
        pub_date: episode.pubDate,
        duration: episode.duration || '',
      },
      { onConflict: 'id' },
    );


  },

  // --- Library ---
  async addToLibrary(
    userId: string,
    episode: Episode,
    status: 'queue' | 'liked' | 'history' | 'downloaded',
  ) {
    try {
      this.ensureUserProfile(userId).catch(() => { });


      await this.upsertEpisode(episode);

      const { error } = await supabase.from('user_library').upsert(
        {
          user_id: userId,
          episode_id: episode.id || episode.audioUrl,
          status: status,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, episode_id, status' },
      );

      if (error) {

      }
    } catch (err) { }

  },

  async removeFromLibrary(
    userId: string,
    episodeId: string,
    status: 'queue' | 'liked' | 'history' | 'downloaded',
  ) {
    const { error } = await supabase
      .from('user_library')
      .delete()
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .eq('status', status);

    if (error) throw error;
  },

  async getLibrary(
    userId: string,
    status: 'queue' | 'liked' | 'history' | 'downloaded',
  ) {

    try {
      const { data, error } = await supabase
        .from('user_library')
        .select(
          `
                    *,
                    episode:episodes(*)
                `,
        )
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
    const { count: likedCount, error: likedError } = await supabase
      .from('user_library')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'liked');


    const followingCount = 0;

    if (likedError) throw likedError;

    return {
      likedCount: likedCount || 0,
      followingCount,
    };
  },
};
