import RNFS from 'react-native-fs';
import { Platform, ToastAndroid } from 'react-native';
import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DownloadProgress, DownloadedEpisode, EpisodeMetadata } from '../types';

export type { DownloadProgress, DownloadedEpisode };

export const DownloadService = {
  CACHE_SIZE_LIMIT: 500 * 1024 * 1024,

  activeDownloads: new Map<string, { jobId: number; promise: Promise<any> }>(),

  getDownloadDirectory(): string {
    return `${RNFS.DocumentDirectoryPath}/downloads`;
  },

  async initializeDownloadDirectory(): Promise<void> {
    try {
      const dir = this.getDownloadDirectory();
      const exists = await RNFS.exists(dir);
      if (!exists) {
        await RNFS.mkdir(dir);
      }
    } catch (error) {
    }
  },

  isUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch (_) {
      return false;
    }
  },
  /** Generate a safe filename from episode ID and optional audio URL */
  getSafeFilename(episodeId: string, audioUrl?: string): string {
    // Remove any existing extension from episodeId first
    const cleanEpisodeId = episodeId.replace(/\.(mp3|m4a|wav|aac)$/i, '');

    // Fallback to .mp3 if audioUrl is missing or malformed
    if (typeof audioUrl !== 'string' || !audioUrl) {
      return `${cleanEpisodeId}.mp3`;
    }
    const urlParts = audioUrl.split('.');
    const extension =
      urlParts.length > 1
        ? `.${urlParts[urlParts.length - 1].split('?')[0]}`
        : '.mp3';
    return `${cleanEpisodeId}${extension}`;
  },

  getFilePath(filename: string): string {
    return `${this.getDownloadDirectory()}/${filename}`;
  },
  async isDownloaded(userId: string, episodeId: string): Promise<boolean> {
    try {
      const download = await this.getDownloadedEpisode(userId, episodeId);
      return download !== null;
    } catch (error) {
      return false;
    }
  },

  async getDownloadedEpisode(
    userId: string,
    episodeId: string,
  ): Promise<DownloadedEpisode | null> {
    try {
      const { data, error } = await supabase
        .from('downloads')
        .select('*')
        .eq('user_id', userId)
        .eq('episode_id', episodeId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data && data.local_path) {
        const exists = await RNFS.exists(data.local_path);
        if (!exists) {
          await this.removeDownloadFromDatabase(userId, episodeId);
          return null;
        }
      }

      return data as DownloadedEpisode;
    } catch (error) {
      return null;
    }
  },

  async getDownloadedEpisodes(userId: string): Promise<DownloadedEpisode[]> {
    try {
      const { data, error } = await supabase
        .from('downloads')
        .select('*')
        .eq('user_id', userId)
        .order('downloaded_at', { ascending: false });

      if (error) throw error;
      return (data as DownloadedEpisode[]) || [];
    } catch (error) {
      try {
        const dir = this.getDownloadDirectory();
        const exists = await RNFS.exists(dir);
        if (!exists) return [];

        const files = await RNFS.readDir(dir);
        const downloads: DownloadedEpisode[] = [];

        for (const file of files) {
          if (
            file.isFile() &&
            (file.name.endsWith('.mp3') || file.name.endsWith('.m4a'))
          ) {
            const episodeId = file.name.replace(/\.(mp3|m4a)$/, '');
            downloads.push({
              id: episodeId,
              user_id: userId,
              episode_id: episodeId,
              local_path: file.path,
              file_size: file.size,
              downloaded_at: new Date(file.mtime || Date.now()).toISOString(),
            });
          }
        }

        return downloads;
      } catch (fsError) {
        return [];
      }
    }
  },

  async getTotalCacheSize(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('downloads')
        .select('file_size')
        .eq('user_id', userId);

      if (error) throw error;
      const totalSize = (data as { file_size: number }[]).reduce(
        (sum, item) => sum + (item.file_size || 0),
        0,
      );
      return totalSize;
    } catch (error) {
      return 0;
    }
  },

  async downloadAudio(
    userId: string,
    episodeId: string,
    audioUrl: string,
    episodeTitle: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<string> {
    try {
      await this.initializeDownloadDirectory();

      if (this.isUrl(userId)) {
        throw new Error(
          'Invalid user ID provided. Expected an identifier, not a URL.',
        );
      }

      if (this.isUrl(episodeId)) {
        throw new Error(
          'Invalid episode ID provided. Expected an identifier, not a URL.',
        );
      }

      if (this.activeDownloads.has(episodeId)) {
        throw new Error('Episode is already being downloaded');
      }
      const existing = await this.getDownloadedEpisode(userId, episodeId);
      if (existing) {
        return existing.local_path;
      }

      const totalSize = await this.getTotalCacheSize(userId);
      if (totalSize >= this.CACHE_SIZE_LIMIT) {
        throw new Error(
          'Cache size limit exceeded. Please clear some downloads.',
        );
      }

      const filename = this.getSafeFilename(episodeId, audioUrl);
      const filePath = this.getFilePath(filename);

      const downloadTask = RNFS.downloadFile({
        fromUrl: audioUrl,
        toFile: filePath,
        background: true,
        discretionary: true,
        progress: res => {
          if (onProgress) {
            onProgress({
              episodeId: episodeId,
              bytesWritten: res.bytesWritten,
              contentLength: res.contentLength,
              totalBytes: res.contentLength,
              progress: res.bytesWritten / res.contentLength,
            });
          }
        },
      });

      this.activeDownloads.set(episodeId, downloadTask);

      const result = await downloadTask.promise;

      if (result.statusCode === 200) {
        const stat = await RNFS.stat(filePath);
        const fileSize = parseInt(stat.size.toString(), 10);
        await this.saveDownloadToDatabase(
          userId,
          episodeId,
          filePath,
          fileSize,
        );
        this.activeDownloads.delete(episodeId);

        // Show toast notification for download completion
        if (Platform.OS === 'android') {
          const formattedSize = this.formatBytes(fileSize);
          ToastAndroid.showWithGravity(
            `${episodeTitle} (${formattedSize})`,
            ToastAndroid.LONG,
            ToastAndroid.BOTTOM,
          );
        }

        return filePath;
      } else {
        throw new Error(
          `Download failed with status code: ${result.statusCode}`,
        );
      }
    } catch (error) {
      this.activeDownloads.delete(episodeId);
      throw error;
    }
  },

  /** Cancel an active download and clean up partial file */
  async cancelDownload(episodeId: string): Promise<void> {
    const task = this.activeDownloads.get(episodeId);
    if (task) {
      RNFS.stopDownload(task.jobId);
      this.activeDownloads.delete(episodeId);
      // Attempt to delete any partially downloaded file
      const filename = `${episodeId}.mp3`;
      const filePath = this.getFilePath(filename);
      try {
        await RNFS.unlink(filePath);
      } catch (e) { }
    }
  },

  /** Delete a downloaded episode (file + DB entry) */
  async deleteDownload(userId: string, episodeId: string): Promise<void> {
    try {
      const download = await this.getDownloadedEpisode(userId, episodeId);
      if (!download) return;

      const exists = await RNFS.exists(download.local_path);
      if (exists) {
        await RNFS.unlink(download.local_path);
      }

      await this.removeDownloadFromDatabase(userId, episodeId);
    } catch (error) {
      throw error;
    }
  },

  /** Clear all downloads for a user */
  async clearAllDownloads(userId: string): Promise<void> {
    try {
      const downloads = await this.getDownloadedEpisodes(userId);
      for (const dl of downloads) {
        try {
          const exists = await RNFS.exists(dl.local_path);
          if (exists) await RNFS.unlink(dl.local_path);
        } catch (e) { }
      }
      const { error } = await supabase
        .from('downloads')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },

  /** Check if a specific episode is currently being downloaded */
  isDownloading(episodeId: string): boolean {
    return this.activeDownloads.has(episodeId);
  },

  /** Get file size in bytes */
  async getFileSize(filePath: string): Promise<number> {
    try {
      const stat = await RNFS.stat(filePath);
      return parseInt(stat.size.toString(), 10);
    } catch (error) {
      return 0;
    }
  },

  /** Convert bytes to human‑readable string */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },

  /** Private: store download metadata in Supabase */
  async saveDownloadToDatabase(
    userId: string,
    episodeId: string,
    localPath: string,
    fileSize: number,
  ): Promise<void> {
    const { error } = await supabase.from('downloads').upsert(
      {
        user_id: userId,
        episode_id: episodeId,
        local_path: localPath,
        file_size: fileSize,
        downloaded_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,episode_id' },
    );
    if (error) {
      throw error;
    }
  },

  /** Private: remove download record from Supabase */
  async removeDownloadFromDatabase(
    userId: string,
    episodeId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('downloads')
      .delete()
      .eq('user_id', userId)
      .eq('episode_id', episodeId);
    if (error) {
      throw error;
    }
  },

  /** Cache episode metadata locally for offline access */
  async cacheEpisodeMetadata(
    episodeId: string,
    metadata: EpisodeMetadata,
  ): Promise<void> {
    try {
      const key = `episode_meta_${episodeId}`;
      await AsyncStorage.setItem(key, JSON.stringify(metadata));
    } catch (error) { }
  },

  /** Get cached episode metadata */
  async getEpisodeMetadata(episodeId: string): Promise<EpisodeMetadata | null> {
    try {
      const key = `episode_meta_${episodeId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  },

  /** Migration: Fix existing files with double extensions */
  async fixDoubleExtensions(userId: string): Promise<void> {
    try {
      const dir = this.getDownloadDirectory();
      const exists = await RNFS.exists(dir);
      if (!exists) return;

      const files = await RNFS.readDir(dir);
      let fixedCount = 0;

      for (const file of files) {
        // Check if file has double extension like .mp3.mp3
        if (file.name.match(/\.(mp3|m4a|wav|aac)\.(mp3|m4a|wav|aac)$/i)) {
          const newName = file.name.replace(
            /\.(mp3|m4a|wav|aac)\.(mp3|m4a|wav|aac)$/i,
            '.$2',
          );
          const newPath = `${dir}/${newName}`;

          // Rename the file
          await RNFS.moveFile(file.path, newPath);

          // Update database record
          const episodeId = newName.replace(/\.(mp3|m4a|wav|aac)$/i, '');
          const { error } = await supabase
            .from('downloads')
            .update({ local_path: newPath })
            .eq('user_id', userId)
            .eq('episode_id', episodeId);

          if (error) {
            // Failed to update DB
          }

          fixedCount++;
        }
      }
    } catch (error) { }
  },
};
