import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Slider from "@react-native-community/slider";
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { useAppSelector } from "../../redux/hooks";
import { DatabaseService } from "../../services/database";

interface Props {
  navigation: any;
  route?: any;
}

export default function PlayerScreen({ navigation, route }: Props) {
  const { user } = useAppSelector((state) => state.auth);
  const params = route?.params || {};
  const episodes: any[] = params.episodes || [];
  const startIndex: number = typeof params.index === 'number' ? params.index : 0;

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Use TrackPlayer's built-in progress hook
  const { position, duration } = useProgress();

  const current = episodes[currentIndex] || {};

  // Check if current episode is liked
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user?.id || !current) return;
      try {
        const library = await DatabaseService.getLibrary(user.id, 'liked');
        const isFound = library?.some((item: any) => item.episode_id === (current.audioUrl || current.id));
        setIsLiked(!!isFound);
      } catch (e) { console.log('Error checking like status', e); }
    };
    checkLikeStatus();
  }, [currentIndex, user?.id]);

  // Save to History when track changes or starts
  useEffect(() => {
    const saveToHistory = async () => {
      if (!user?.id || !current) return;
      try {
        await DatabaseService.addToLibrary(user.id, current, 'history');
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
      if (isLiked) {
        await DatabaseService.removeFromLibrary(user.id, current.audioUrl || current.id, 'liked');
        setIsLiked(false);
      } else {
        await DatabaseService.addToLibrary(user.id, current, 'liked');
        setIsLiked(true);
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

        // Try to setup player, ignore if already initialized
        try {
          await TP.setupPlayer();
        } catch (setupError: any) {
          // Ignore "already initialized" error, continue with setup
          if (!setupError?.message?.includes('already been initialized')) {
            throw setupError;
          }
        }

        // Always reset and add new tracks
        await TP.reset();

        const tracks = episodes.map((ep, i) => ({
          id: i,
          url: ep.audioUrl,
          title: ep.title,
          artist: ep.pubDate || 'Unknown',
          artwork: ep.image,
        }));

        if (tracks.length === 0) return;

        await TP.add(tracks);
        if (TP.skip) {
          await TP.skip(startIndex);
          setCurrentIndex(startIndex);
        } else {
          setCurrentIndex(startIndex);
        }
        if (TP.play) await TP.play();
        if (mounted) setIsPlaying(true);
      } catch (e) {
        console.warn('TrackPlayer setup failed:', e);
        Alert.alert('Playback error', 'Unable to start audio player.');
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
      // Stop and reset the player when leaving the screen
      try {
        const TP: any = TrackPlayer;
        if (TP.pause) TP.pause().catch(() => { });
        if (TP.stop) TP.stop().catch(() => { });
        if (TP.reset) TP.reset().catch(() => { });
      } catch (e) { }
    };
  }, [episodes, startIndex]);

  const togglePlay = async () => {
    try {
      const TP: any = TrackPlayer;
      if (TP.getState) {
        const state = await TP.getState();
        const isNowPlaying = state === TP.STATE_PLAYING || state === 'playing';
        if (isNowPlaying) {
          if (TP.pause) await TP.pause();
          setIsPlaying(false);
        } else {
          if (TP.play) await TP.play();
          setIsPlaying(true);
        }
      } else {
        // Fallback when native getState is not available: toggle based on local state
        if (isPlaying) {
          if (TP.pause) await TP.pause();
          setIsPlaying(false);
        } else {
          if (TP.play) await TP.play();
          setIsPlaying(true);
        }
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const next = async () => {
    try {
      const TP: any = TrackPlayer;
      if (TP.skipToNext) {
        await TP.skipToNext();
        if (TP.getCurrentTrack) {
          const id = await TP.getCurrentTrack();
          setCurrentIndex(Number(id));
        } else {
          setCurrentIndex((prev) => Math.min(prev + 1, episodes.length - 1));
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
          setCurrentIndex(Number(id));
        } else {
          setCurrentIndex((prev) => Math.max(prev - 1, 0));
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
            <Ionicons name={isLiked ? "bookmark" : "bookmark-outline"} size={24} color={isLiked ? "#A637FF" : "#000"} />
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
          minimumTrackTintColor="#A067FF"
          maximumTrackTintColor="#D3D3D3"
          thumbTintColor="#A067FF"

        />

        {/* ===== Controls ===== */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={previous}>
            <Ionicons name="play-skip-back" size={30} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallBtn} onPress={seekBack10}>
            <MaterialIcons name="replay-10" size={20} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#A637FF" />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 100,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
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
    fontWeight: "600",
    flex: 1,
  },

  podcastImage: {
    width: "100%",
    height: 260,
    borderRadius: 18,
    marginTop: 40,
    marginBottom: 20,
  },

  author: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.6,
  },

  podcastTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 5,
  },

  episode: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.6,
    marginBottom: 20,
  },

  horizontalLine: {
    height: 1,
    backgroundColor: "#E0E0E0",
    width: "100%",
    marginBottom: 15,
  },

  sliderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    marginLeft: -25,
    paddingLeft: 40,
    marginTop: 20

  },

  time: {
    fontSize: 12,
    opacity: 0.6,
  },

  slider: {
    width: "100%",
    height: 40,
    marginTop: -10,
    // marginLeft: -20,
    // marginRight: 20,
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
    backgroundColor: "#A067FF",
    paddingVertical: 10,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    width: 140,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 15, // Extra padding for bottom safe area if needed
  },

  moreText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
});
