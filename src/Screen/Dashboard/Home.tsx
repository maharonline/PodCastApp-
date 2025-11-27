import React, { useEffect, useState, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Circle, Svg } from "react-native-svg";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import { useAppSelector } from "../../redux/hooks";
import { DownloadService } from "../../services/DownloadService";
import { DatabaseService } from "../../services/database";
import { SUPABASE_ANON_KEY } from "@env";
// import { EpisodeItem } from "../../components/episodes";

interface Episode {
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string | null;
  image: string;
}

// Memoized Episode Item Component for better performance
const EpisodeItem = React.memo(({ item, index, onPlay, onDownload, downloading, downloadProgress, isDownloaded }: {
  item: Episode;
  index: number;
  onPlay: (index: number) => void;
  onDownload: (episode: Episode) => void;
  downloading: boolean;
  downloadProgress: number;
  isDownloaded: boolean;
}) => (
  <View style={styles.podcastItem}>
    <Image source={{ uri: item.image }} style={styles.podcastImage} />

    <View style={styles.podcastContent}>
      <Text style={styles.podcastTitle}>{item.title}</Text>
      <Text style={styles.podcastSpeaker}>{item.pubDate}</Text>

      <View style={styles.podcastActions}>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => onPlay(index)}
        >
          <Ionicons name="play" size={16} color="#fff" />
          <Text style={styles.playBtnText}>Play</Text>
        </TouchableOpacity>

        <View style={styles.actionIconsRow}>
          {isDownloaded ? (
            <View style={styles.downloadedContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            </View>
          ) : (
            <TouchableOpacity onPress={() => onDownload(item)} disabled={downloading}>
              {downloading ? (
                <View style={styles.progressContainer}>
                  <Svg width="24" height="24" viewBox="0 0 24 24">
                    <Circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#E0E0E0"
                      strokeWidth="2"
                      fill="none"
                    />
                    <Circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#4CAF50"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 10}`}
                      strokeDashoffset={`${2 * Math.PI * 10 * (1 - downloadProgress)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 12 12)"
                    />
                  </Svg>
                  <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}%</Text>
                </View>
              ) : (
                <Feather
                  name="download"
                  size={20}
                  style={styles.actionIcon}
                />
              )}
            </TouchableOpacity>
          )}
          <Feather name="share-2" size={20} style={styles.actionIcon} />
          <Feather name="more-vertical" size={20} style={styles.actionIcon} />
        </View>
      </View>
    </View>
  </View>
));

export default function Home() {

  const { user } = useAppSelector((state: any) => state.auth);
  const { unreadCount } = useAppSelector((state: any) => state.notifications);

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingEpisodes, setDownloadingEpisodes] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [downloadedEpisodes, setDownloadedEpisodes] = useState<Set<string>>(new Set());


  const SUPABASE_RSS_URL = "https://bfchuybsseczmjmmosda.supabase.co/functions/v1/rss";

  const navigation = useNavigation<any>();

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
    navigation.navigate("Player", { episodes, index });
  }, [episodes, navigation]);

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

    // Extract a safe ID for the download service (must not be a URL)
    // We take the last part of the URL and remove any query parameters
    const safeEpisodeId = episode.audioUrl.split('/').pop()?.split('?')[0] || `ep_${Date.now()}`;

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
    <EpisodeItem
      item={item}
      index={index}
      onPlay={handlePlay}
      onDownload={handleDownload}
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
    <FlatList
      data={episodes}
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
              <Text style={styles.headerTitle}>Hello {user?.name || user?.display_name} !</Text>
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
            <View style={styles.banner}>
              <Image source={{ uri: episodes[0].image }} style={styles.bannerImage} />
              <View style={styles.bannerContentRow}>
                <View style={styles.bannerText}>
                  <Text style={styles.bannerCategory}>Tech Podcast</Text>
                  <Text style={styles.bannerTitle}>{episodes[0].title}</Text>
                  <Text style={styles.bannerSubtitle}>Latest Episode</Text>
                </View>

                <TouchableOpacity
                  style={styles.playNowBtn}
                  onPress={() => navigation.navigate("Player", { episodes, index: 0 })}
                >
                  <Text style={styles.playNowText}>Play Now</Text>
                  <Ionicons name="play" size={16} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New Episodes</Text>
            <TouchableOpacity onPress={() => navigation.navigate("AllEpisodes", { episodes })}>
              <Text style={styles.sectionSeeAll}>See all</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    />
  );
}

// STYLES (unchanged)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  header: { marginTop: 40, flexDirection: "row", justifyContent: "space-between" },
  headerTitle: { fontSize: 24, fontWeight: "700" },
  headerSubtitle: { color: "gray", marginTop: 2 },
  notificationBtn: {
    backgroundColor: "#F2F2F2",
    width: 38,
    height: 38,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  banner: {
    marginTop: 25,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  bannerImage: { width: "100%", height: 180 },
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
  bannerTitle: { fontSize: 20, fontWeight: "700", marginTop: 5, color: "white" },
  bannerSubtitle: { color: "white", marginBottom: 10 },
  playNowBtn: {
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
  },
  playNowText: { color: "black", fontWeight: "600", marginRight: 8 },
  sectionHeader: { marginTop: 25, flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionSeeAll: { color: "#A637FF" },
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
});