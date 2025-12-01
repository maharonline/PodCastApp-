import React, { useEffect, useState, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { Circle, Svg } from "react-native-svg";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import { useAppSelector, useAppDispatch } from "../../redux/hooks";
import { DownloadService } from "../../services/DownloadService";
import { DatabaseService } from "../../services/database";
import { SUPABASE_ANON_KEY } from "@env";
import PodcastCard from "../../components/PodCastCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { setPlaylist } from "../../redux/playerSlice";

interface Episode {
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string | null;
  image: string;
}

export default function Home() {

  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state: any) => state.auth);
  const { unreadCount } = useAppSelector((state: any) => state.notifications);

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingEpisodes, setDownloadingEpisodes] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [downloadedEpisodes, setDownloadedEpisodes] = useState<Set<string>>(new Set());


  const SUPABASE_RSS_URL = "https://bfchuybsseczmjmmosda.supabase.co/functions/v1/rss";

  const navigation = useNavigation<any>();

  const trendingimages = [
    require("../../assets/trending1.jpg"),
    require("../../assets/trending2.jpg"),

  ];
  useEffect(() => {
    fetchEpisodes();
    loadDownloadedEpisodes();
  }, []);

  const loadDownloadedEpisodes = async () => {
    if (!user?.id) return;
    try {
      const downloaded = await DownloadService.getDownloadedEpisodes(user.id);
      const downloadedIds = new Set(downloaded.map((d: any) => d.episode_id));
      setDownloadedEpisodes(downloadedIds);
    } catch (e) {
      console.log('Error loading downloaded episodes:', e);
    }
  };


  const fetchEpisodes = async () => {
    try {
      const response = await fetch(SUPABASE_RSS_URL, {
        method: 'POST',  // ya GET bhi ho sakta hai
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, // ← yahan token
          'Content-Type': 'application/json'
        }
      });

      const json = await response.json();
      console.log("RSS JSON:", json);

      const formatted: Episode[] = json.episodes || [];
      setEpisodes(formatted);
      setLoading(false);
    } catch (err) {
      console.log("RSS ERROR:", err);
      setEpisodes([]);
      setLoading(false);
    }
  };


  // Memoized callback for playing episodes - MUST be before any conditional returns
  const handlePlay = useCallback((index: number) => {
    // Dispatch to Redux for mini player
    dispatch(setPlaylist({ episodes, index }));
    navigation.navigate("Player", { episodes, index });
  }, [episodes, navigation, dispatch]);

  // Handle download
  const handleDownload = useCallback(async (episode: Episode) => {
    if (!episode.audioUrl) {
      Alert.alert("Error", "No audio URL available");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "Please log in to download episodes");
      return;
    }

    const episodeId = episode.audioUrl;
    setDownloadingEpisodes(prev => new Set(prev).add(episodeId));

    const safeEpisodeId = DatabaseService.getEpisodeIdFromUrl(episode.audioUrl);

    try {
      // Ensure episode exists in database BEFORE downloading
      await DatabaseService.upsertEpisode({
        ...episode,
        id: safeEpisodeId
      });

      // Download the file
      await DownloadService.downloadAudio(
        user.id,
        safeEpisodeId,
        episode.audioUrl,
        episode.title,
        (progress) => {
          const percent = progress.progress;
          console.log(`Download progress: ${(percent * 100).toFixed(0)}%`);
          setDownloadProgress(prev => new Map(prev).set(episodeId, percent));
        }
      );

      // Cache episode metadata for offline access
      await DownloadService.cacheEpisodeMetadata(safeEpisodeId, {
        title: episode.title,
        description: episode.description,
        image_url: episode.image,
        pub_date: episode.pubDate,
        audio_url: episode.audioUrl,
      });

      // Save to database with 'downloaded' status
      await DatabaseService.addToLibrary(user.id, {
        ...episode,
        id: safeEpisodeId
      }, 'downloaded');

      Alert.alert("Success", "Episode downloaded successfully!");

      // Mark as downloaded
      setDownloadedEpisodes(prev => new Set(prev).add(episodeId));
    } catch (error: any) {
      console.error("Download error:", error);
      Alert.alert("Download Failed", error.message || "Failed to download episode");
    } finally {
      setDownloadingEpisodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(episodeId);
        return newSet;
      });
      // Clear progress
      setDownloadProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(episodeId);
        return newMap;
      });
    }
  }, [user]);

  // Memoized render function
  const renderEpisode = useCallback(({ item, index }: { item: Episode; index: number }) => (
    <PodcastCard
      item={item}
      onPlay={() => handlePlay(index)}
      onDownload={() => handleDownload(item)}
      downloading={downloadingEpisodes.has(item.audioUrl || '')}
      downloadProgress={downloadProgress.get(item.audioUrl || '') || 0}
      isDownloaded={downloadedEpisodes.has(item.audioUrl?.split('/').pop()?.split('?')[0] || '')}
    />
  ), [handlePlay, handleDownload, downloadingEpisodes, downloadProgress, downloadedEpisodes]);

  // Get item layout for better scrolling performance
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 119, // height of podcastItem
    offset: 119 * index,
    index,
  }), []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#A637FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={['top']}>
      <FlatList
        data={episodes.slice(0, 5)}
        keyExtractor={(item, idx) => item.audioUrl || String(idx)}
        renderItem={renderEpisode}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        // Performance optimizations
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={5}
        ListHeaderComponent={() => (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Hello {user?.name || user?.display_name}!</Text>
                <Text style={styles.headerSubtitle}>Find your favorite podcast</Text>
              </View>

              <TouchableOpacity
                style={styles.notificationBtn}
                onPress={() => navigation.navigate("Notifications")}
              >
                <Ionicons name="notifications-outline" size={22} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {episodes.length > 0 && (
              <View style={{ marginTop: 25 }}>
                <FlatList
                  data={episodes.slice(0, 3)}
                  keyExtractor={(item, idx) => item.audioUrl || String(idx)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  // contentContainerStyle={{ paddingLeft: 20, paddingRight: 10 }}
                  renderItem={({ item, index }) => (
                    <View style={[styles.banner, { width: 285, marginRight: 15 }]}>
                      <Image source={{ uri: item.image }} style={[styles.bannerImage]} />
                      <View style={styles.bannerContentRow}>
                        <View style={styles.bannerText}>
                          <Text style={styles.bannerCategory}>Tech Podcast</Text>
                          <Text style={styles.bannerTitle} numberOfLines={2}>{item.title}</Text>
                          <Text style={styles.bannerSubtitle}>Latest Episode</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.playNowBtn}
                          onPress={() => navigation.navigate("Player", { episodes, index })}
                        >
                          <Text style={styles.playNowText}>Play Now</Text>
                          <Ionicons name="play" size={16} color="#000" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              </View>
            )}



            {/* Top Trending Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Trending #10</Text>
              <TouchableOpacity onPress={() => navigation.navigate("AllEpisodes", { episodes })}>
                <Text style={styles.sectionSeeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            {/* Trending Horizontal Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>

              {trendingimages.map((img, index) => (
                <Image
                  key={index}
                  source={img}
                  style={styles.trendingImage}
                />
              ))}
            </ScrollView>


            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Updates</Text>
              <TouchableOpacity onPress={() => navigation.navigate("AllEpisodes", { episodes })}>
                <Text style={styles.sectionSeeAll}>See all</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      />
    </SafeAreaView>
  );
}

// STYLES (unchanged)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  header: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
  headerTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold' },
  headerSubtitle: { color: "gray", marginTop: 2, fontFamily: 'Inter-Regular', fontSize: 13 },
  notificationBtn: {
    // backgroundColor: "#F2F2F2",
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  banner: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  bannerImage: { width: 300, height: 168, },
  bannerContentRow: {
    position: "absolute",
    bottom: 0,
    left: 15,
    right: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerCategory: { color: "white", fontSize: 13 },
  bannerText: { flex: 1, padding: 12 },
  bannerTitle: { fontSize: 20, fontFamily: 'Inter-Bold', marginTop: 5, color: "#fff" },
  bannerSubtitle: { color: "white", marginBottom: 10, fontFamily: 'Inter-Regular' },
  playNowBtn: {
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
  },
  playNowText: { color: "black", fontFamily: 'Inter-Regular', marginRight: 8 },
  sectionHeader: { marginTop: 25, flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  sectionSeeAll: { color: "#A637FF", fontFamily: 'Inter-Regular', textDecorationLine: 'underline' },
  podcastItem: {
    flexDirection: "row",
    marginTop: 20,
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  podcastImage: { width: 95, height: 95, borderRadius: 14 },
  podcastContent: { flex: 1, marginLeft: 12 },
  podcastTitle: { fontSize: 15, fontWeight: "700" },
  podcastSpeaker: { color: "gray", marginTop: 3 },
  podcastActions: { flexDirection: "row", marginTop: 10, alignItems: "center", justifyContent: "space-between" },
  actionIconsRow: { flexDirection: "row", alignItems: "center" },
  playBtn: {
    flexDirection: "row",
    backgroundColor: "#A637FF",
    width: 66,
    height: 28,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  playBtnText: { color: "#fff", fontWeight: "600" },
  actionIcon: { marginLeft: 15, color: "#000" },
  progressContainer: {
    position: "relative",
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 15,
  },
  progressText: {
    position: "absolute",
    fontSize: 8,
    fontWeight: "700",
    color: "#4CAF50",
  },
  downloadedContainer: {
    marginLeft: 15,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  /* Horizontal Scroll */
  horizontalScroll: { marginTop: 15 },
  trendingImage: {
    width: 153,
    height: 175,
    borderRadius: 16,
    marginRight: 15
  },

  /* Banner Horizontal Scroll */
  // bannerHorizontalItem: {
  //   width: 200,
  //   marginRight: 15,
  //   borderRadius: 16,
  //   overflow: "hidden",
  //   backgroundColor: "#000",
  // },
  // bannerImageHorizontal: {
  //   width: "100%",
  //   height: 120,
  // },
  // bannerTextHorizontal: {
  //   position: "absolute",
  //   bottom: 0,
  //   left: 10,
  //   right: 10,
  //   padding: 8,
  // },
  // bannerTitleHorizontal: { color: "#fff", fontWeight: "700", fontSize: 14 },
  // bannerSubtitleHorizontal: { color: "#fff", fontSize: 12 },

});

