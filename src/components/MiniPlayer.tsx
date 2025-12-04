import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TrackPlayer, { useTrackPlayerEvents, Event, State } from 'react-native-track-player';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { setPlaybackState, setLikeStatus, setDownloadStatus, setCurrentEpisode } from '../redux/playerSlice';
import { DatabaseService } from '../services/database';
import { DownloadService } from '../services/DownloadService';
import { navigationRef } from '../Appnavigation/Appnavigator';

export default function MiniPlayer() {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { currentEpisode, episodes, currentIndex, isPlaying, isLiked, isDownloaded } = useAppSelector((state) => state.player);

    // Listen to playback state changes from background controls
    useTrackPlayerEvents([Event.PlaybackState], async (event) => {
        if (event.type === Event.PlaybackState) {
            const playing = event.state === State.Playing;
            dispatch(setPlaybackState(playing));
        }
    });

    // Check like and download status when episode changes
    useEffect(() => {
        const checkStatus = async () => {
            if (!currentEpisode || !user?.id) return;

            try {
                // Check like status
                const library = await DatabaseService.getLibrary(user.id, 'liked');
                const safeId = DatabaseService.getEpisodeIdFromUrl(currentEpisode.audioUrl || currentEpisode.id || '');
                const liked = library?.some((item: any) => item.episode_id === safeId);
                dispatch(setLikeStatus(!!liked));

                // Check download status
                const downloads = await DownloadService.getDownloadedEpisodes(user.id);
                const downloaded = downloads.some((d: any) => d.episode_id === safeId);
                dispatch(setDownloadStatus(downloaded));
            } catch (e) {
                console.log('Error checking episode status:', e);
            }
        };

        checkStatus();
    }, [currentEpisode?.audioUrl, user?.id, dispatch]);

    const togglePlay = async () => {
        try {
            if (isPlaying) {
                await TrackPlayer.pause();
            } else {
                await TrackPlayer.play();
            }
        } catch (e) {
            console.error('Toggle play error:', e);
        }
    };

    const toggleLike = async () => {
        if (!user?.id || !currentEpisode) {
            Alert.alert("Sign In Required", "Please sign in to like episodes.");
            return;
        }

        try {
            const safeId = DatabaseService.getEpisodeIdFromUrl(currentEpisode.audioUrl || currentEpisode.id || '');

            if (isLiked) {
                await DatabaseService.removeFromLibrary(user.id, safeId, 'liked');
                dispatch(setLikeStatus(false));
            } else {
                await DatabaseService.addToLibrary(user.id, { ...currentEpisode, id: safeId }, 'liked');
                dispatch(setLikeStatus(true));
            }
        } catch (e) {
            console.error("Error toggling like:", e);
            Alert.alert("Error", "Could not update like status.");
        }
    };

    const openPlayer = () => {
        if (navigationRef.isReady()) {
            (navigationRef as any).navigate('Player', { episodes, index: currentIndex });
        }
    };

    const closeMiniPlayer = async () => {
        try {
            await TrackPlayer.stop();
            await TrackPlayer.reset();
            dispatch(setPlaybackState(false));
            dispatch(setCurrentEpisode(null));
        } catch (error) {
            console.log("Error closing mini player:", error);
        }
    };

    if (!currentEpisode) {
        return null;
    }

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={openPlayer}
            activeOpacity={0.8}
        >
            <View style={styles.content}>
                {/* Episode Image */}
                <Image
                    source={{ uri: currentEpisode.image || 'https://via.placeholder.com/50' }}
                    style={styles.image}
                />

                {/* Episode Title */}
                <Text style={styles.title} numberOfLines={1}>
                    {currentEpisode.title}
                </Text>

                {/* Controls */}
                <View style={styles.controls}>
                    {/* Download Status */}
                    {isDownloaded && (
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" style={styles.icon} />
                    )}

                    {/* Favorite Button */}
                    <TouchableOpacity onPress={toggleLike} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons
                            name={isLiked ? "bookmark" : "bookmark-outline"}
                            size={24}
                            color={isLiked ? "#00FF00" : "#fff"}
                            style={styles.icon}
                        />
                    </TouchableOpacity>

                    {/* Play/Pause Button */}
                    <TouchableOpacity onPress={togglePlay} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={28}
                            color="#fff"
                        />
                    </TouchableOpacity>

                    {/* Close Button */}
                    <TouchableOpacity onPress={closeMiniPlayer} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close" size={26} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        backgroundColor: '#A637FF',
        borderTopWidth: 1,
        borderTopColor: '#A637FF',
        elevation: 10,
        shadowColor: '#A637FF',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    image: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
    },
    title: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: '#fff',
        marginRight: 12,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginLeft: 16,
    },
});