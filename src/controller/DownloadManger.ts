import { DatabaseService } from '../services/database';
import { DownloadService } from '../services/DownloadService';
import { Alert } from 'react-native';

export const DownloadManager = {
  async downloadEpisode(
    userId: string,
    episode: any,
    callbacks: {
      onProgress?: (percent: number) => void;
      onComplete?: (episodeId: string) => void;
    },
  ) {
    const audioUrl = episode.audioUrl || episode.audio_url;

    if (!audioUrl) {
      Alert.alert('Error', 'No audio URL available');
      return false;
    }

    if (!userId) {
      Alert.alert('Error', 'Please log in to download episodes');
      return false;
    }

    const episodeId = DatabaseService.getEpisodeIdFromUrl(audioUrl);

    try {
      await DatabaseService.upsertEpisode({ ...episode, id: episodeId });

      await DownloadService.downloadAudio(
        userId,
        episodeId,
        audioUrl,
        episode.title,
        progress => {
          callbacks.onProgress?.(progress.progress);
        },
      );

      await DownloadService.cacheEpisodeMetadata(episodeId, {
        title: episode.title,
        description: episode.description,
        image: episode.image,
        pubDate: episode.pubDate,
        audioUrl: audioUrl,
      });

      await DatabaseService.addToLibrary(
        userId,
        { ...episode, id: episodeId },
        'downloaded',
      );

      // Notify parent component that download is complete
      callbacks.onComplete?.(episodeId);

      return episodeId;
    } catch (error: any) {
      Alert.alert(
        'Download Failed',
        error.message || 'Failed to download episode',
      );
      return false;
    }
  },
};
