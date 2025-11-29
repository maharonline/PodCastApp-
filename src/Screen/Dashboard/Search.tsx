import React, { useEffect, useState, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, TextInput, ActivityIndicator, Alert } from "react-native";
import { Circle, Svg } from "react-native-svg";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import { useAppSelector } from "../../redux/hooks";
import { XMLParser } from "fast-xml-parser";
import { DownloadService } from "../../services/DownloadService";
import { DatabaseService } from "../../services/database";
import { SUPABASE_ANON_KEY } from "@env";
import { SafeAreaView } from "react-native-safe-area-context";

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
      <Text style={styles.podcastTitle} numberOfLines={2}>{item.title}</Text>
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

export default function Search() {
  const { user } = useAppSelector((state: any) => state.auth);
  const navigation = useNavigation<any>();

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState<Episode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingEpisodes, setDownloadingEpisodes] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [downloadedEpisodes, setDownloadedEpisodes] = useState<Set<string>>(new Set());

  const SUPABASE_RSS_URL = "https://bfchuybsseczmjmmosda.supabase.co/functions/v1/rss"

  useEffect(() => {
    fetchEpisodes();
    loadDownloadedEpisodes();
  }, []);

  // Filter episodes when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEpisodes(episodes);
    } else {
      const filtered = episodes.filter(ep =>
        ep.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEpisodes(filtered);
    }
  }, [searchQuery, episodes]);

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

  // Memoized callback for playing episodes
  const handlePlay = useCallback((index: number) => {
    navigation.navigate("Player", { episodes: filteredEpisodes, index });
  }, [filteredEpisodes, navigation]);

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
      setDownloadedEpisodes(prev => new Set(prev).add(safeEpisodeId));
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
  const renderEpisode = useCallback(({ item, index }: { item: Episode; index: number }) => {
    const safeEpisodeId = item.audioUrl?.split('/').pop()?.split('?')[0] || '';
    return (
      <EpisodeItem
        item={item}
        index={index}
        onPlay={handlePlay}
        onDownload={handleDownload}
        downloading={downloadingEpisodes.has(item.audioUrl || '')}
        downloadProgress={downloadProgress.get(item.audioUrl || '') || 0}
        isDownloaded={downloadedEpisodes.has(safeEpisodeId)}
      />
    );
  }, [handlePlay, handleDownload, downloadingEpisodes, downloadProgress, downloadedEpisodes]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#A637FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={['top']}>
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.inputBox}>
          <Ionicons name="search" size={20} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            placeholder="Search by episode name..."
            placeholderTextColor="#1F1F1F"
            keyboardType="web-search"
            autoCapitalize="none"
            autoCorrect={false}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results Count */}
        {searchQuery.trim() !== "" && (
          <Text style={styles.resultsText}>
            {filteredEpisodes.length} result{filteredEpisodes.length !== 1 ? 's' : ''} found
          </Text>
        )}

        {/* Episode List */}
        <FlatList
          data={filteredEpisodes}
          keyExtractor={(item, idx) => item.audioUrl || String(idx)}
          renderItem={renderEpisode}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No episodes found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },

  /* Search Bar */
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDEDED",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    marginTop: 10,
  },
  input: { flex: 1, fontSize: 15, color: "#1F1F1F" },

  resultsText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    fontWeight: "600",
  },

  /* Podcast List */
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

  /* Empty State */
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
});
