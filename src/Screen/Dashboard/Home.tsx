import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { DownloadService } from '../../services/DownloadService';
import { DatabaseService } from '../../services/database';
import { SUPABASE_ANON_KEY, SUPABASE_RSS_URL } from '@env';
import PodcastCard from '../../components/PodCastCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setPlaylist } from '../../redux/playerSlice';
import { Episode, RootState } from '../../types';
import { COLORS } from '../../constants/colors';

export default function Home() {

  // console.log(SUPABASE_RSS_URL);

  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state: RootState) => state.auth);
  const { unreadCount } = useAppSelector(
    (state: RootState) => state.notifications,
  );

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadedEpisodes, setDownloadedEpisodes] = useState<Set<string>>(
    new Set(),
  );
  const [enrichedEpisodes, setEnrichedEpisodes] = useState<Episode[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const navigation = useNavigation<any>();

  const trendingimages = [
    require('../../assets/trending_01.jpg'),
    require('../../assets/trending_02.jpg'),
  ];

  useFocusEffect(
    useCallback(() => {
      fetchEpisodes();
      loadDownloadedEpisodes();
    }, []),
  );

  useEffect(() => {
    const enrichEpisodesWithCache = async () => {
      if (episodes.length === 0) {
        setEnrichedEpisodes([]);
        return;
      }

      const enriched = await Promise.all(
        episodes.map(async ep => {
          const safeEpisodeId = ep.audioUrl?.split('/').pop()?.split('?')[0];
          if (safeEpisodeId && downloadedEpisodes.has(safeEpisodeId)) {
            try {
              const cachedMetadata = await DownloadService.getEpisodeMetadata(
                safeEpisodeId,
              );
              if (cachedMetadata) {
                return { ...ep, ...cachedMetadata };
              }
            } catch (e) { }
          }
          return ep;
        }),
      );

      setEnrichedEpisodes(enriched);
    };

    enrichEpisodesWithCache();
  }, [episodes, downloadedEpisodes]);

  const loadDownloadedEpisodes = async () => {
    if (!user?.id) return;

    try {
      const downloaded = await DownloadService.getDownloadedEpisodes(user.id);
      const downloadedIds = new Set(downloaded.map((d: any) => d.episode_id));
      setDownloadedEpisodes(downloadedIds);
    } catch (e) { }
  };

  const fetchEpisodes = async () => {
    try {
      const response = await fetch(SUPABASE_RSS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
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

  const handlePlay = useCallback(
    (index: number) => {
      dispatch(setPlaylist({ episodes, index }));
      navigation.navigate('Player', { episodes, index });
    },
    [episodes, navigation, dispatch],
  );

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

  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: 119,
      offset: 119 * index,
      index,
    }),
    [],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchEpisodes(), loadDownloadedEpisodes()]);
    setRefreshing(false);
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <FlatList
        data={
          enrichedEpisodes.length > 0
            ? enrichedEpisodes.slice(0, 5)
            : episodes.slice(0, 5)
        }
        keyExtractor={(item, idx) => item.audioUrl || String(idx)}
        renderItem={renderEpisode}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
        ListHeaderComponent={() => (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>
                  Hello {user?.display_name}!
                </Text>
                <Text style={styles.headerSubtitle}>
                  Find your favorite podcast
                </Text>
              </View>

              <TouchableOpacity
                style={styles.notificationBtn}
                onPress={() => navigation.navigate('Notifications')}
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
                  renderItem={({ item, index }) => (
                    <View
                      style={[styles.banner, { width: 285, marginRight: 15 }]}
                    >
                      <Image
                        source={{ uri: item.image }}
                        style={styles.bannerImage}
                      />

                      <View style={styles.bannerContentRow}>
                        <View style={styles.bannerText}>
                          <Text style={styles.bannerCategory}>
                            Tech Podcast
                          </Text>

                          <Text style={styles.bannerTitle} numberOfLines={2}>
                            {item.title}
                          </Text>

                          <Text style={styles.bannerSubtitle}>
                            Latest Episode
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.playNowBtn}
                          onPress={() =>
                            navigation.navigate('Player', { episodes, index })
                          }
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

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Trending #10</Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('AllEpisodes', { episodes })}
              >
                <Text style={styles.sectionSeeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {trendingimages.map((img, index) => (
                <Image key={index} source={img} style={styles.trendingImage} />
              ))}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Updates</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AllEpisodes', { episodes })}
              >
                <Text style={styles.sectionSeeAll}>See all</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  headerSubtitle: {
    color: 'gray',
    marginTop: 2,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  notificationBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  banner: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    width: 300,
    height: 168,
  },
  bannerContentRow: {
    position: 'absolute',
    bottom: 0,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerCategory: {
    color: 'white',
    fontSize: 13,
  },
  bannerText: {
    flex: 1,
    padding: 12,
  },
  bannerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 5,
    color: '#fff',
  },
  bannerSubtitle: {
    color: 'white',
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
  },
  playNowBtn: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playNowText: {
    color: 'black',
    fontFamily: 'Inter-Regular',
    marginRight: 8,
  },
  sectionHeader: {
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  sectionSeeAll: {
    color: COLORS.PRIMARY,
    fontFamily: 'Inter-Regular',
    textDecorationLine: 'underline',
  },
  horizontalScroll: {
    marginTop: 15,
  },
  trendingImage: {
    width: 153,
    height: 175,
    borderRadius: 16,
    marginRight: 15,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
