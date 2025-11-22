import TrackPlayer, { Event } from 'react-native-track-player';

const playbackService = async () => {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    await TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    // next track logic
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    // previous track logic
  });
};

export default playbackService;
