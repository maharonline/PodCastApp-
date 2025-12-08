import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ToastAndroid,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import { useFocusEffect } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { supabase } from '../../supabase';
import { setLoggedOut, setLoggedIn } from '../../redux/authSlice';
import { store } from '../../redux/store';
import { DatabaseService, LibraryItem } from '../../services/database';
import { DownloadService } from '../../services/DownloadService';
import { DownloadManager } from '../../controller/DownloadManger';
import PodcastCard from '../../components/PodCastCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import StripeBackground from '../../components/StripeLine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer from 'react-native-track-player';
import { clearPlayer } from '../../redux/playerSlice';

interface Props {
  navigation: any;
}

export default function EditProfile({ navigation }: Props) {
  const { user } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();

  const [username, setUsername] = useState(
    user?.display_name || user?.name || '',
  );
  const [stats, setStats] = useState({ likedCount: 0, followingCount: 0 });
  const [recentlyPlayed, setRecentlyPlayed] = useState<LibraryItem[]>([]);
  const [fullHistory, setFullHistory] = useState<LibraryItem[]>([]); // Store all history for playback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadedEpisodes, setDownloadedEpisodes] = useState<Set<string>>(
    new Set(),
  );
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const fetchProfileData = async () => {
    console.log('Profile: fetchProfileData called. User ID:', user?.id);

    if (!user?.id) {
      console.log('Profile: No user ID found, stopping fetch.');
      setLoading(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);
      console.log('Profile: Starting database fetches...');

      // Fetch Stats, History, and Downloaded Episodes in parallel
      const [statsData, historyData, downloadedData] = await Promise.all([
        DatabaseService.getLibraryStats(user?.id),
        DatabaseService.getLibrary(user?.id, 'history'),
        DownloadService.getDownloadedEpisodes(user?.id),
      ]);
      setStats(statsData);

      // Remove duplicates - keep only the most recent occurrence of each episode
      const uniqueHistory: LibraryItem[] = [];
      const seenEpisodeIds = new Set<string>();

      for (const item of historyData || []) {
        if (item.episode?.id && !seenEpisodeIds.has(item.episode.id)) {
          seenEpisodeIds.add(item.episode.id);
          uniqueHistory.push(item);
        }
      }

      // Store full history for playback
      setFullHistory(uniqueHistory);
      // Limit display to last 5 unique episodes
      setRecentlyPlayed(uniqueHistory.slice(0, 5));

      // Set downloaded episodes
      const downloadedIds = new Set(
        downloadedData.map((d: any) => d.episode_id),
      );
      setDownloadedEpisodes(downloadedIds);
    } catch (error: any) {
      Alert.alert(
        'Error',
        'Failed to load profile data. Pull down to refresh.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfileData();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [user?.id]),
  );

  // Get avatar URL from either direct property or user_metadata (for Google OAuth)
  const avatarUrl = user?.avatar_url || user?.user_metadata?.avatar_url;
  const displayName =
    user?.display_name ||
    user?.user_metadata?.display_name ||
    user?.name ||
    user?.email;

  // Handle Image Selection
  const handleImagePicker = async (type: 'camera' | 'library') => {
    if (!user?.id) return;

    const options: any = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
    };

    const callback = async (response: any) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        try {
          setLoading(true);
          const fileName = asset.fileName || `avatar_${Date.now()}.jpg`;

          // Upload to Supabase
          if (!user?.id) throw new Error('User ID not found');

          const newAvatarUrl = await DatabaseService.uploadAvatar(
            user.id,
            asset.uri,
            fileName,
          );

          // Update Redux - ensure both avatar_url and user_metadata.avatar_url are updated
          const updatedUser = {
            ...user,
            avatar_url: newAvatarUrl,
            user_metadata: {
              ...user.user_metadata,
              avatar_url: newAvatarUrl,
            },
          };
          dispatch(setLoggedIn(updatedUser));

          ToastAndroid.show('Profile picture updated!', ToastAndroid.LONG);
        } catch (error: any) {
          Alert.alert('Error', 'Failed to upload image');
        } finally {
          setLoading(false);
        }
      }
    };

    if (type === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  const handleSaveChanges = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      // Ensure profile exists first
      await DatabaseService.ensureUserProfile(
        user.id,
        user.email || '',
        username as string,
      );

      // Update profile in Supabase
      const updatedProfile = await DatabaseService.updateUserProfile(user.id, {
        display_name: username as string,
        email: user.email || '',
      });

      console.log('Profile updated in Supabase:', updatedProfile);

      // Update Redux state
      dispatch(
        setLoggedIn({
          ...user,
          display_name: username as string,
        }),
      );

      ToastAndroid.show('Profile updated successfully!', ToastAndroid.LONG);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handleSignOut = async (navigation: any) => {
    try {
      await AsyncStorage.clear();

      store.dispatch(setLoggedOut());
      store.dispatch(clearPlayer());

      await TrackPlayer.reset();
      await TrackPlayer.pause();
      await TrackPlayer.stop();

      navigation.replace('Register');
      ToastAndroid.show('Signed out successfully', ToastAndroid.LONG);

      const { error } = await supabase.auth.signOut();
      if (error) console.log('Supabase sign out failed:', error.message);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Something went wrong during sign out.',
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#A637FF"
            />
          }
        >
          {/*======== HEADER ===========*/}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={26} style={{ marginTop: 30 }} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Edit Profile</Text>

            <View style={{ width: 26 }}>
              <TouchableOpacity onPress={() => handleSignOut(navigation)}>
                <Ionicons
                  name="log-out-outline"
                  size={26}
                  color="#000"
                  style={{ marginTop: 30 }}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginTop: 40 }}>
            {/*==== AVATAR SECTION =====*/}
            <View style={styles.avatarWrapper}>
              <StripeBackground />
              <TouchableOpacity
                onPress={() => setShowAvatarModal(true)}
                activeOpacity={0.8}
              >
                <Image
                  source={
                    avatarUrl
                      ? { uri: avatarUrl }
                      : require('../../assets/headphone.png')
                  }
                  style={styles.avatar}
                />
              </TouchableOpacity>
              {/*====== Edit Avatar Button ======*/}
              <TouchableOpacity
                style={styles.editAvatarBtn}
                onPress={() => {
                  Alert.alert('Change Profile Picture', 'Choose an option', [
                    {
                      text: 'Take Photo',
                      onPress: () => handleImagePicker('camera'),
                    },
                    {
                      text: 'Choose from Gallery',
                      onPress: () => handleImagePicker('library'),
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                  ]);
                }}
              >
                <Ionicons name="camera" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/*===== PURPLE CARD ======*/}
            <View style={styles.profileCard}>
              <StripeBackground />
              <Text style={styles.name}>{String(displayName || 'User')}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{stats.likedCount}</Text>
                  <Text style={styles.statLabel}>Liked Podcasts</Text>
                </View>

                {/*===== Vertical Divider =======*/}
                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{stats.followingCount}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>
            </View>
          </View>

          {/*====== USERNAME INPUT ========*/}
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username.toString()}
            onChangeText={setUsername}
          />

          {/*=========== RECENTLY PLAYED ===========*/}
          <Text style={styles.sectionTitle}>Recently Played</Text>

          {loading ? (
            <ActivityIndicator
              size="small"
              color="#A637FF"
              style={{ marginTop: 20 }}
            />
          ) : recentlyPlayed.length === 0 ? (
            <Text style={{ color: 'gray', marginTop: 10 }}>
              No recently played episodes.
            </Text>
          ) : (
            recentlyPlayed.map((item, index) => {
              // Use fullHistory for playback so all episodes are available
              const allEpisodes = fullHistory.map(i => ({
                id: i.episode?.id || '',
                title: i.episode?.title || '',
                description: i.episode?.description || '',
                audioUrl: i.episode?.audio_url || null,
                image: i.episode?.image_url || '',
                pubDate: i.episode?.pub_date || '',
                duration: i.episode?.duration || '',
              }));

              // Find the index in fullHistory for proper playback
              const playIndex = fullHistory.findIndex(i => i.id === item.id);
              const episodeId = item.episode?.id || '';

              return (
                <View key={item.id} style={styles.recentPlayRow}>
                  <Text style={styles.recentPlayNumber}>{index + 1}.</Text>
                  <View style={styles.recentPlayCard}>
                    <PodcastCard
                      item={(item.episode || item) as any}
                      onPlay={() =>
                        navigation.navigate('Player', {
                          episodes: allEpisodes,
                          index: playIndex >= 0 ? playIndex : index,
                        })
                      }
                      onDownloadComplete={() => {
                        // Refresh downloaded episodes
                        fetchProfileData();
                      }}
                      userId={user?.id}
                      isDownloaded={downloadedEpisodes.has(episodeId)}
                    />
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/*====== SAVE BUTTON ======*/}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChanges}>
          <Text style={styles.saveText}>Save Changes</Text>
        </TouchableOpacity>
      </View>

      {/*====== Avatar Viewer Modal =====*/}
      <Modal
        visible={showAvatarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAvatarModal(false)}
        >
          <Image
            source={
              avatarUrl
                ? { uri: avatarUrl }
                : require('../../assets/headphone.png')
            }
            style={styles.modalImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setShowAvatarModal(false)}
          >
            <Ionicons name="close-circle" size={44} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // marginTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Manrope-Bold',
    textAlign: 'center',
    marginTop: 30,
    flex: 1,
  },

  avatarWrapper: {
    position: 'absolute',
    zIndex: 10,
    elevation: 10,
    backgroundColor: '#fff', // White background for border effect
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  avatar: {
    width: 140, // Smaller than wrapper to show white border
    height: 140,
    borderRadius: 70,
  },

  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4800E0',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },

  profileCard: {
    backgroundColor: '#4800E0', // Deep purple matching the screenshot
    paddingTop: 70,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderRadius: 22,
    alignItems: 'center',
    width: 286,
    height: 224,
    marginTop: 60,
    overflow: 'hidden',
  },

  name: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'PublicSans-Bold',
    marginTop: 30,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '70%',
    marginTop: 15,
  },

  statBox: { alignItems: 'center' },

  statDivider: {
    width: 1,
    height: 40,
    // backgroundColor: "rgba(255,255,255,0.3)",
    backgroundColor: '#fff',
  },

  statNumber: {
    color: '#fff',
    fontSize: 19,
    fontFamily: 'PublicSans-Bold',
  },

  statLabel: {
    fontFamily: 'PublicSans-Regular',
    color: '#ddd',
    fontSize: 12,
  },

  label: {
    marginTop: 25,
    fontSize: 14,
    color: '#8D5CF6',
    fontFamily: 'Manrope-SemiBold',
  },

  input: {
    borderWidth: 1,
    borderColor: '#8D5CF6',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    fontSize: 16,
    fontFamily: 'Manrope-Regular',
  },

  sectionTitle: {
    marginTop: 20,
    fontSize: 17,
    fontFamily: 'PublicSans-Bold',
  },

  recentPlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    // fontFamily: 'PublicSans-Bold',
  },

  recentPlayNumber: {
    width: 20,
    fontSize: 17,
    fontWeight: '700',
    // marginRight: 10,
  },

  recentPlayCard: {
    flex: 1,
  },

  saveBtn: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'black',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalImage: {
    width: '90%',
    height: '70%',
  },

  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
});
