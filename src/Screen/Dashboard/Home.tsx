import React, { useEffect, useState, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import { useAppSelector } from "../../redux/hooks";
import { XMLParser } from "fast-xml-parser";
import { DownloadService } from "../../services/DownloadService";
import { DatabaseService } from "../../services/database";

interface Episode {
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string | null;
  image: string;
}

// Memoized Episode Item Component for better performance
const EpisodeItem = React.memo(({ item, index, onPlay, onDownload, downloading }: {
  item: Episode;
  index: number;
  onPlay: (index: number) => void;
  onDownload: (episode: Episode) => void;
  downloading: boolean;
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
          <TouchableOpacity onPress={() => onDownload(item)} disabled={downloading}>
            <Feather
              name={downloading ? "loader" : "download"}
              size={20}
              style={[styles.actionIcon, downloading && { opacity: 0.5 }]}
            />
          </TouchableOpacity>
          <Feather name="share-2" size={20} style={styles.actionIcon} />
          <Feather name="more-vertical" size={20} style={styles.actionIcon} />
        </View>
      </View>
    </View>
  </View>
));

export default function Home() {

  const { user } = useAppSelector((state: any) => state.auth);

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingEpisodes, setDownloadingEpisodes] = useState<Set<string>>(new Set());

  const RSS_URL = "https://podcasts.files.bbci.co.uk/p01plr2p.rss";

  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchEpisodes();
  }, []);

  const fetchEpisodes = async () => {
    try {
      const response = await fetch(RSS_URL);
      const xmlText = await response.text();

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
      });

      const json = parser.parse(xmlText);
      const channel = json?.rss?.channel;

      if (!channel) {
        console.log("RSS PARSE FAILED: no channel");
        setEpisodes([]);
        setLoading(false);
        return;
      }

      // MAIN IMAGE SAFE
      const mainImage =
        channel["itunes:image"]?.href ||
        channel?.image?.url ||
        "https://via.placeholder.com/400";

      // Normalize items to an array and guard against missing/invalid values
      const rawItems = channel.item;
      const itemsArray = rawItems
        ? Array.isArray(rawItems)
          ? rawItems
          : [rawItems]
        : [];

      // 💠 SAFE FORMAT (NO ERRORS)
      const formatted: Episode[] = itemsArray
        .filter((item) => !!(item && (item.enclosure?.url || item["enclosure"]?.url)))
        .map((item) => ({
          title: item?.title || "No Title",
          description: item?.description || "",
          pubDate: item?.pubDate || "",
          audioUrl: (item?.enclosure?.url || item?.["enclosure"]?.url) || null,
          image: mainImage,
        }));

      console.log("FORMATTED:", formatted.length, "episodes parsed");

      setEpisodes(formatted);
      setLoading(false);

    } catch (err) {
      console.log("RSS ERROR:", err);
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

    try {
      // Download the file
      await DownloadService.downloadAudio(
        episode.audioUrl,
        episode.title,
        (progress) => {
          console.log(`Download progress: ${(progress.progress * 100).toFixed(0)}%`);
        }
      );

      // Save to database with 'downloaded' status
      await DatabaseService.addToLibrary(user.id, {
        id: episode.audioUrl,
        title: episode.title,
        description: episode.description,
        audioUrl: episode.audioUrl,
        image: episode.image,
        pubDate: episode.pubDate,
      }, 'downloaded');

      Alert.alert("Success", "Episode downloaded successfully!");
    } catch (error: any) {
      console.error("Download error:", error);
      Alert.alert("Download Failed", error.message || "Failed to download episode");
    } finally {
      setDownloadingEpisodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(episodeId);
        return newSet;
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
    />
  ), [handlePlay, handleDownload, downloadingEpisodes]);

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

            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={22} />
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
});
