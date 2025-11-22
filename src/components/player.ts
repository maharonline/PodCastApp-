import TrackPlayer from 'react-native-track-player';
import { Episode } from './types';

// Setup TrackPlayer once
export const setupPlayer = async () => {
  try {
    await TrackPlayer.setupPlayer();
  } catch (err) {
    console.error("TrackPlayer setup error:", err);
  }
};

export const playEpisode = async (episode: Episode) => {
  if (!episode.audioUrl) {
    console.warn("Episode has no audio URL!");
    return;
  }

  try {
    await TrackPlayer.reset(); // clear previous track

    await TrackPlayer.add({
      id: episode.title,
      url: episode.audioUrl,
      title: episode.title,
      artist: "Podcast",
    });

    await TrackPlayer.play();
  } catch (err) {
    console.error("Error playing episode:", err);
  }
};
