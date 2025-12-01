import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Slider from "@react-native-community/slider";
import TrackPlayer, { useProgress, Event, State, useTrackPlayerEvents } from 'react-native-track-player';
import { useAppSelector, useAppDispatch } from "../../redux/hooks";
import { DatabaseService } from "../../services/database";
import { DownloadService } from "../../services/DownloadService";
import { setPlaylist, setPlaybackState, setCurrentIndex as setReduxIndex, setLikeStatus } from "../../redux/playerSlice";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  navigation: any;
  route?: any;
}

export default function PlayerScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const params = route?.params || {};
  // Handle both single episode (from notification) and array of episodes (from list)
  const episodes: any[] = params.episodes || (params.episode ? [params.episode] : []);
  const startIndex: number = typeof params.index === 'number' ? params.index : 0;

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false); // Will be updated by event listener
  const [isLiked, setIsLiked] = useState(false);

  // Use TrackPlayer's built-in progress hook
  const { position, duration } = useProgress();

  // Listen to playback state changes to sync UI with actual player state
  useTrackPlayerEvents([Event.PlaybackState], async (event) => {
    if (event.type === Event.PlaybackState) {
      const state = event.state;
      console.log('📻 Playback state changed:', state);
      const playing = state === State.Playing;
      setIsPlaying(playing);
      setIsBuffering(state === State.Buffering);
      // Update Redux state
      dispatch(setPlaybackState(playing));
    }
  });

  const current = episodes[currentIndex] || {};

  // Check if current episode is liked
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user?.id || !current) return;
      try {
        const library = await DatabaseService.getLibrary(user.id, 'liked');
        const safeId = DatabaseService.getEpisodeIdFromUrl(current.audioUrl || current.id);
        const isFound = library?.some((item: any) => item.episode_id === safeId);
        setIsLiked(!!isFound);
        // Update Redux state
        dispatch(setLikeStatus(!!isFound));
      } catch (e) { console.log('Error checking like status', e); }
    };
    checkLikeStatus();
  }, [currentIndex, user?.id, dispatch]);

  // Save to History when track changes or starts
  useEffect(() => {
    const saveToHistory = async () => {
      if (!user?.id || !current) return;
      try {
        const safeId = DatabaseService.getEpisodeIdFromUrl(current.audioUrl || current.id);
        await DatabaseService.addToLibrary(user.id, { ...current, id: safeId }, 'history');
      } catch (e) { console.log('Error saving history', e); }
    };

    if (currentIndex >= 0 && episodes.length > 0) {
      saveToHistory();
    }
  }, [currentIndex, user?.id]);

  const toggleLike = async () => {
    if (!user?.id) {
      Alert.alert("Sign In Required", "Please sign in to like episodes.");
      return;
    }
    try {
      const safeId = DatabaseService.getEpisodeIdFromUrl(current.audioUrl || current.id);
      if (isLiked) {
        await DatabaseService.removeFromLibrary(user.id, safeId, 'liked');
        setIsLiked(false);
        dispatch(setLikeStatus(false));
      } else {
        await DatabaseService.addToLibrary(user.id, { ...current, id: safeId }, 'liked');
        setIsLiked(true);
        dispatch(setLikeStatus(true));
      }
    } catch (e) {
      console.error("Error toggling like:", e);
      Alert.alert("Error", "Could not update like status.");
    }
  };

  useEffect(() => {
    let mounted = true;
    async function setup() {
      try {
        const TP: any = TrackPlayer;

        // First, try to setup player (safe)
        try {
          await TP.setupPlayer();
        } catch (setupError: any) {
          if (!setupError?.message?.includes('already been initialized')) {
            throw setupError;
          }
        }

        // ⚠️ STEP 1 — CHECK IF TRACK ALREADY PLAYING (IMPORTANT)
        const activeTrack = await TrackPlayer.getActiveTrack();
        const currentMeta = episodes[startIndex];

        // Extract episode ID from both URLs to compare (handles both local and online URLs)
        const getEpisodeId = (url: string) => {
          if (!url) return null;
          // For local files: /data/.../p0mjs904.mp3.mp3 -> p0mjs904.mp3
          // For online URLs: http://.../vpid/p0mjs904.mp3 -> p0mjs904.mp3
          const parts = url.split('/');
          const filename = parts[parts.length - 1];
          return filename.replace('.mp3.mp3', '.mp3').replace('.mp3', '');
        };

        const activeEpisodeId = getEpisodeId(activeTrack?.url || '');
        const currentEpisodeId = getEpisodeId(currentMeta?.audioUrl || '');

        console.log("🔍 DEBUG - Active Episode ID:", activeEpisodeId);
        console.log("🔍 DEBUG - Current Episode ID:", currentEpisodeId);
        console.log("🔍 DEBUG - Are they equal?", activeEpisodeId === currentEpisodeId);

        // Check if same track is already playing by comparing episode IDs
        if (activeTrack && currentMeta && activeEpisodeId && currentEpisodeId && activeEpisodeId === currentEpisodeId) {
          console.log("🔥 SAME TRACK ALREADY PLAYING — SKIPPING RESET");
          // Just sync the local state with what's already playing
          const state = await TrackPlayer.getPlaybackState();
          setIsPlaying(state.state === State.Playing);
          setCurrentIndex(startIndex);
          dispatch(setPlaylist({ episodes, index: startIndex }));
          return; // ←←← THIS PREVENTS RESTART
        }

        console.log("⚠️ Different track detected, will reset and play new track");

        // STEP 2 — Build track list
        let downloadedMap = new Map<string, string>();
        if (user?.id) {
          try {
            const allDownloads = await DownloadService.getDownloadedEpisodes(user.id);
            allDownloads.forEach(d => {
              if (d.episode_id && d.local_path) {
                downloadedMap.set(d.episode_id, d.local_path);
              }
            });
          } catch (e) {
            console.warn('Error fetching downloaded episodes:', e);
          }
        }

        const tracks = episodes.map((ep, i) => {
          let audioSource = ep.audioUrl;

          const safeEpisodeId = ep.audioUrl?.split('/').pop()?.split('?')[0];
          if (safeEpisodeId && downloadedMap.has(safeEpisodeId)) {
            audioSource = downloadedMap.get(safeEpisodeId);
          }

          return {
            id: i,
            url: audioSource,
            title: ep.title,
            artist: ep.pubDate || "Unknown",
            artwork: ep.image,
          };
        });

        // STEP 3 — ADD TRACKS ONLY IF DIFFERENT FROM CURRENT PLAYBACK
        console.log("🎧 Adding playlist fresh...");
        await TP.reset();
        await TP.add(tracks);

        await TP.skip(startIndex);
        setCurrentIndex(startIndex);

        console.log("▶️ Starting playback...");
        await TP.play();

        dispatch(setPlaylist({ episodes, index: startIndex }));

      } catch (e) {
        console.warn("TrackPlayer setup failed:", e);
        Alert.alert("Playback error", "Unable to start audio player.");
      }
    }

    setup();

    const onTrackChange = async () => {
      try {
        const TP: any = TrackPlayer;
        if (TP.getCurrentTrack) {
          const trackId = await TP.getCurrentTrack();
          if (trackId != null) setCurrentIndex(Number(trackId));
        }
      } catch (e) { }
    };

    const interval: any = setInterval(onTrackChange, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
      // Keep playback alive when navigating away - don't stop/reset
      // The mini player will control playback
    };
  }, []);

  const togglePlay = async () => {
    try {
      console.log('🎮 Toggle play - current state:', isPlaying);

      if (isPlaying) {
        console.log('⏸️ Pausing...');
        await TrackPlayer.pause();
      } else {
        console.log('▶️ Playing...');
        await TrackPlayer.play();
      }
      // Note: isPlaying state will be updated by the event listener
    } catch (e) {
      console.error('❌ Toggle play error:', e);
      Alert.alert('Playback Error', 'Unable to toggle playback');
    }
  };

  const next = async () => {
    try {
      const TP: any = TrackPlayer;
      if (TP.skipToNext) {
        await TP.skipToNext();
        if (TP.getCurrentTrack) {
          const id = await TP.getCurrentTrack();
          const newIndex = Number(id);
          setCurrentIndex(newIndex);
          dispatch(setReduxIndex(newIndex));
        } else {
          setCurrentIndex((prev) => {
            const newIndex = Math.min(prev + 1, episodes.length - 1);
            dispatch(setReduxIndex(newIndex));
            return newIndex;
          });
        }
      } else {
        // fallback: advance local index
        setCurrentIndex((prev) => Math.min(prev + 1, episodes.length - 1));
      }
      if (TP.play) await TP.play();
      setIsPlaying(true);
    } catch (e) {
      console.warn('Next failed', e);
    }
  };

  const previous = async () => {
    try {
      const TP: any = TrackPlayer;
      if (TP.skipToPrevious) {
        await TP.skipToPrevious();
        if (TP.getCurrentTrack) {
          const id = await TP.getCurrentTrack();
          const newIndex = Number(id);
          setCurrentIndex(newIndex);
          dispatch(setReduxIndex(newIndex));
        } else {
          setCurrentIndex((prev) => {
            const newIndex = Math.max(prev - 1, 0);
            dispatch(setReduxIndex(newIndex));
            return newIndex;
          });
        }
      } else {
        // fallback: decrement local index
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      }
      if (TP.play) await TP.play();
      setIsPlaying(true);
    } catch (e) {
      console.warn('Previous failed', e);
    }
  };

  const seekBy = async (offsetSeconds: number) => {
    try {
      const newPos = Math.max(0, Math.min(position + offsetSeconds, duration));
      await TrackPlayer.seekTo(newPos);
    } catch (e) {
      console.warn('Seek failed:', e);
    }
  };

  const seekForward10 = () => seekBy(10);
  const seekBack10 = () => seekBy(-10);

  // Helper function to format time in MM:SS
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={['top']}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* ===== Header ===== */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#000" />
            </TouchableOpacity>

            <Text style={styles.screenTitle} numberOfLines={1}>
              {current?.title ? String(current.title).slice(0, 40) : 'Player'}
            </Text>

            <TouchableOpacity onPress={toggleLike}>
              <Ionicons name={isLiked ? "bookmark" : "bookmark-outline"} style={styles.bookmarkIcon} size={24} color={isLiked ? "#A637FF" : "#000"} />
            </TouchableOpacity>
          </View>

          {/* ===== Podcast Image ===== */}
          <Image source={{ uri: current?.image || 'https://via.placeholder.com/600' }} style={styles.podcastImage} />

          {/* ===== Text Details ===== */}
          <Text style={styles.author}>{current?.artist || ''}</Text>
          <Text style={styles.podcastTitle}>{current?.title || 'Unknown title'}</Text>
          <Text style={styles.episode}>{current?.pubDate || ''}</Text>

          {/* ===== Horizontal Line ===== */}
          <View style={styles.horizontalLine} />

          {/* ===== Slider Time Row ===== */}
          <View style={styles.sliderRow}>
            <Text style={styles.time}>{formatTime(position)}</Text>
            <Text style={styles.time}>{formatTime(duration)}</Text>
          </View>

          {/* ===== Slider ===== */}
          <View style={styles.sliderContainer}>
            {/* Track Container with margins */}
            <View style={styles.trackContainer}>
              {/* Active Track */}
              <View style={[
                styles.customTrackActive,
                { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }
              ]} />
            </View>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={duration > 0 ? position / duration : 0}
              onValueChange={async (value) => {
                try {
                  const newPosition = value * duration;
                  await TrackPlayer.seekTo(newPosition);
                } catch (e) {
                  console.warn('Seek failed:', e);
                }
              }}
              minimumTrackTintColor="transparent"
              maximumTrackTintColor="transparent"
              thumbTintColor="#A067FF"
            />
          </View>

          {/* ===== Controls ===== */}
          <View style={styles.controls}>
            <TouchableOpacity onPress={previous}>
              <Ionicons name="play-skip-back" size={30} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.smallBtn} onPress={seekBack10}>
              <MaterialIcons name="replay-10" size={20} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.playBtn} onPress={togglePlay} disabled={isBuffering}>
              {isBuffering ? (
                <ActivityIndicator size="large" color="#A637FF" />
              ) : (
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#A637FF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.smallBtn} onPress={seekForward10}>
              <MaterialIcons name="forward-10" size={20} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity onPress={next}>
              <Ionicons name="play-skip-forward" size={30} color="#000" />
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* ===== More Button (Sticky Bottom) ===== */}
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => navigation.navigate("AllEpisodes", { episodes })}
        >
          <Ionicons name="chevron-up" size={20} color="#fff" style={{ marginBottom: -5 }} />
          <Text style={styles.moreText}>More</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  scrollContent: {
    padding: 20,
    // paddingTop: 40,
    paddingBottom: 100,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    // marginBottom: 15,
  },

  backBtn: {
    backgroundColor: "#F2F2F2",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  screenTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
  },

  bookmarkIcon: {
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 20,
    padding: 5,
  },

  podcastImage: {
    width: "100%",
    height: 350,
    borderRadius: 40,
    marginTop: 20,
    // marginBottom: 20,
  },

  author: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.6,
  },

  podcastTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    textAlign: "center",
    marginTop: 5,
  },

  episode: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: 'Inter-Regular',
    opacity: 0.6,
    marginBottom: 20,
  },

  horizontalLine: {
    height: 1,
    backgroundColor: "#E0E0E0",
    width: "100%",
    marginBottom: 5,
  },

  sliderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    marginLeft: -25,
    paddingLeft: 40,
    marginTop: 10

  },

  time: {
    fontSize: 12,
    opacity: 0.6,
  },

  sliderContainer: {
    width: "100%",
    height: 40,
    marginTop: -10,
    justifyContent: 'center',
  },

  trackContainer: {
    marginHorizontal: 15, // Align with slider thumb travel
    height: 9,
    backgroundColor: '#D3D3D3',
    borderRadius: 4,
    overflow: 'hidden',
  },

  customTrackActive: {
    height: '100%',
    backgroundColor: '#A637FF',
  },

  slider: {
    position: 'absolute',
    width: "100%",
    height: 40,
  },

  controls: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginTop: 0,
    // marginBottom: 30,
  },

  playBtn: {
    backgroundColor: "#F4E5FF",
    width: 55,
    height: 55,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },

  smallBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  moreBtn: {
    position: "absolute",
    bottom: 44,
    alignSelf: "center",
    backgroundColor: "#A637FF",
    paddingVertical: 10,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    width: 157,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 15,
  },

  moreText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    // marginTop: 2,
  },
});
