import React, { useEffect, useState, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, Image, RefreshControl, TouchableOpacity, FlatList, StyleSheet, TextInput, ActivityIndicator, Alert, Dimensions, ScrollView } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import { useAppSelector, useAppDispatch } from "../../redux/hooks";
import { DownloadService } from "../../services/DownloadService";
import { DatabaseService } from "../../services/database";
import { SUPABASE_ANON_KEY } from "@env";
import { SafeAreaView } from "react-native-safe-area-context";
import PodcastCard from "../../components/PodCastCard";
import { setPlaylist } from "../../redux/playerSlice";

interface Episode {
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string | null;
  image: string;
}

const podcasts = [
  {
    id: 1,
    title: 'Mind of an Entrepreneur',
    category: 'Business',
    image: require('../../assets/search1.png'),
  },
  {
    id: 2,
    title: 'Unravelling the Mind',
    category: 'Healthy Lifestyle',
    image: require('../../assets/search2.png'),
  },
  {
    id: 3,
    title: 'A Tale of Writer',
    category: 'Educational',
    image: require('../../assets/search3.png'),
  },
  {
    id: 4,
    title: 'Addiction to Social!',
    category: 'Sociology',
    image: require('../../assets/search4.png'),
  },
];

export default function Search() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state: any) => state.auth);
  const navigation = useNavigation<any>();

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState<Episode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingEpisodes, setDownloadingEpisodes] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [downloadedEpisodes, setDownloadedEpisodes] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

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
      // Error loading downloaded episodes
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

      const formatted: Episode[] = json.episodes || [];
      setEpisodes(formatted);
      setLoading(false);
    } catch (err) {
      setEpisodes([]);
      setLoading(false);
    }
  };

  // Memoized callback for playing episodes
  const handlePlay = useCallback((index: number) => {
    // Dispatch to Redux for mini player
    dispatch(setPlaylist({ episodes: filteredEpisodes, index }));
    navigation.navigate("Player", { episodes: filteredEpisodes, index });
  }, [filteredEpisodes, navigation, dispatch]);

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
      <PodcastCard
        item={item}
        onPlay={() => handlePlay(index)}
        onDownload={() => handleDownload(item)}
        downloading={downloadingEpisodes.has(item.audioUrl || '')}
        downloadProgress={downloadProgress.get(item.audioUrl || '') || 0}
        isDownloaded={downloadedEpisodes.has(safeEpisodeId)}
      />
    );
  }, [handlePlay, handleDownload, downloadingEpisodes, downloadProgress, downloadedEpisodes]);
  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchEpisodes(),
      loadDownloadedEpisodes()
    ]);
    setRefreshing(false);
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#A637FF" />
      </View>
    );
  }

  const renderHeader = () => (
    <>
      {/* Only show category cards when NOT searching */}
      {searchQuery.trim() === "" && (
        <View style={styles.row}>
          {podcasts.map((item) => (
            <TouchableOpacity key={item.id} style={styles.card}>
              <Image source={item.image} style={styles.cardImage} />
              <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
              <Text style={styles.category}>{item.category}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results Count */}
      {searchQuery.trim() !== "" && (
        <Text style={styles.resultsText}>
          {filteredEpisodes.length} result{filteredEpisodes.length !== 1 ? 's' : ''} found
        </Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={['top']}>
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.inputBox}>
          <Ionicons name="search" size={20} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            placeholder="Search the podcast here..."
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

        <FlatList
          data={filteredEpisodes}
          keyExtractor={(item, idx) => item.audioUrl || String(idx)}
          renderItem={renderEpisode}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#A637FF']}
              tintColor="#A637FF"
            />
          }
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

const cardWidth = (Dimensions.get('window').width / 2) - 25;

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
  input: { flex: 1, fontSize: 15, color: "#1F1F1F", fontFamily: 'PublicSans-Medium' },

  resultsText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    fontFamily: 'PublicSans-SemiBold',
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  card: {
    width: cardWidth,
    marginTop: 20,
    borderRadius: 12,
    paddingBottom: 10,
    // backgroundColor: "",
    // marginBottom: 20,
    // shadowColor: '#000',
    // shadowOpacity: 0.15,       
    // shadowRadius: 6,
    // elevation: 6,
  },
  cardImage: {
    width: '100%',
    height: 125,
    borderRadius: 12,
    // borderTopLeftRadius: 12,
    // borderTopRightRadius: 12,
  },

  title: {
    fontSize: 15,
    fontFamily: 'PublicSans-Bold',
    marginTop: 8,
    paddingHorizontal: 8,     // <-- ADD
  },
  category: {
    fontSize: 13,
    color: 'gray',
    marginTop: 3,
    paddingHorizontal: 8,
    fontFamily: 'PublicSans-Regular',
  },
});
