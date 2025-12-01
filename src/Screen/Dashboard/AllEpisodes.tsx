import React, { useCallback, useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useAppSelector } from "../../redux/hooks";
import { DatabaseService } from "../../services/database";
import { DownloadService } from "../../services/DownloadService";
import PodcastCard from "../../components/PodCastCard";
import { SafeAreaView } from "react-native-safe-area-context";

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
    const { user } = useAppSelector((state) => state.auth);
    const params = route?.params || {};
    const episodes: Episode[] = params.episodes || [];

    const nav = useNavigation<any>();

    // Download state
    const [downloadingEpisodes, setDownloadingEpisodes] = useState<Set<string>>(new Set());
    const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
    const [downloadedEpisodes, setDownloadedEpisodes] = useState<Set<string>>(new Set());

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

        const episodeUrl = episode.audioUrl;
        setDownloadingEpisodes(prev => new Set(prev).add(episodeUrl));

        // Extract a safe ID for the download service
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
                    setDownloadProgress(prev => new Map(prev).set(episodeUrl, percent));
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

            Alert.alert("Success", "Episode downloaded successfully!");
            setDownloadedEpisodes(prev => new Set(prev).add(safeEpisodeId));

        } catch (error: any) {
            console.error("Download error:", error);
            Alert.alert("Download Failed", error.message || "Failed to download episode");
        } finally {
            setDownloadingEpisodes(prev => {
                const newSet = new Set(prev);
                newSet.delete(episodeUrl);
                return newSet;
            });
            setDownloadProgress(prev => {
                const newMap = new Map(prev);
                newMap.delete(episodeUrl);
                return newMap;
            });
        }
    }, [user?.id]);

    // Memoized callback for playing episodes
    const handlePlay = useCallback((index: number) => {
        nav.navigate("Player", { episodes, index });
    }, [episodes, nav]);

    // Memoized render function
    const renderEpisode = useCallback(({ item, index }: { item: Episode; index: number }) => {
        const episodeId = item.audioUrl?.split('/').pop()?.split('?')[0] || '';
        return (
            <PodcastCard
                item={item}
                onPlay={() => handlePlay(index)}
                onDownload={() => handleDownload(item)}
                downloading={downloadingEpisodes.has(item.audioUrl || '')}
                downloadProgress={downloadProgress.get(item.audioUrl || '') || 0}
                isDownloaded={downloadedEpisodes.has(episodeId)}
            />
        );
    }, [handlePlay, handleDownload, downloadingEpisodes, downloadProgress, downloadedEpisodes]);

    // Get item layout for better scrolling performance
    const getItemLayout = useCallback((data: any, index: number) => ({
        length: 119, // height of podcastItem (95 + 12 + 12 padding)
        offset: 119 * index,
        index,
    }), []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={['top']}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={20} color="#000" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>All Episodes</Text>

                    <View style={{ width: 36 }} />
                </View>

                {/* Episodes List */}
                <FlatList
                    data={episodes}
                    keyExtractor={(item, idx) => item.audioUrl || String(idx)}
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
        backgroundColor: "#fff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 10, // Reduced from 40
        paddingBottom: 15,
    },
    backBtn: {
        backgroundColor: "#F2F2F2",
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Manrope-Bold',
    },
});
