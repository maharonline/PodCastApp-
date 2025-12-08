import React, { useCallback, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppSelector } from '../../redux/hooks';
import { DatabaseService } from '../../services/database';
import { DownloadService } from '../../services/DownloadService';
import PodcastCard from '../../components/PodCastCard';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Episode {
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string | null;
  image: string;
}

interface Props {
  navigation: any;
  route?: any;
}

export default function AllEpisodes({ navigation, route }: Props) {
  const { user } = useAppSelector(state => state.auth);
  const params = route?.params || {};
  const episodes: Episode[] = params.episodes || [];

  const nav = useNavigation<any>();

  // Download state
  const [downloadingEpisodes, setDownloadingEpisodes] = useState<Set<string>>(
    new Set(),
  );
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(
    new Map(),
  );
  const [downloadedEpisodes, setDownloadedEpisodes] = useState<Set<string>>(
    new Set(),
  );

  // Check for existing downloads
  useEffect(() => {
    const checkDownloads = async () => {
      if (user?.id) {
        const downloads = await DownloadService.getDownloadedEpisodes(user.id);
        const ids = new Set(downloads.map(d => d.episode_id));
        setDownloadedEpisodes(ids);
      }
    };
    checkDownloads();
  }, [user?.id]);

  // Memoized callback for playing episodes
  const handlePlay = useCallback(
    (index: number) => {
      nav.navigate('Player', { episodes, index });
    },
    [episodes, nav],
  );

  const loadDownloadedEpisodes = async () => {
    if (!user?.id) return;

    try {
      const downloaded = await DownloadService.getDownloadedEpisodes(user.id);
      const downloadedIds = new Set(downloaded.map((d: any) => d.episode_id));
      setDownloadedEpisodes(downloadedIds);
    } catch (e) { }
  };

  // Memoized render function
  const renderEpisode = useCallback(
    ({ item, index }: { item: Episode; index: number }) => {
      const episodeId = DatabaseService.getEpisodeIdFromUrl(
        item.audioUrl || '',
      );

      return (
        <PodcastCard
          item={item}
          onPlay={() => handlePlay(index)}
          onDownloadComplete={() => loadDownloadedEpisodes()}
          userId={user?.id}
          isDownloaded={downloadedEpisodes.has(episodeId)}
        />
      );
    },
    [handlePlay, user, downloadedEpisodes],
  );
  // Get item layout for better scrolling performance
  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: 119, // height of podcastItem (95 + 12 + 12 padding)
      offset: 119 * index,
      index,
    }),
    [],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>All Episodes</Text>

          <View style={{ width: 36 }} />
        </View>

        {/* Episodes List */}
        <FlatList
          data={episodes}
          keyExtractor={(item, idx) => `${item.audioUrl || 'episode'}_${idx}`}
          renderItem={renderEpisode}
          contentContainerStyle={{ padding: 20, paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
          // Performance optimizations
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={5}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10, // Reduced from 40
    paddingBottom: 15,
  },
  backBtn: {
    backgroundColor: '#F2F2F2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Manrope-Bold',
  },
});
