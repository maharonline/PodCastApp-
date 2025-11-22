import React, { useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";

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

// Memoized Episode Item Component for better performance
const EpisodeItem = React.memo(({ item, index, onPlay }: { item: Episode; index: number; onPlay: (index: number) => void }) => (
    <View style={styles.podcastItem}>
        <Image source={{ uri: item.image }} style={styles.podcastImage} />

        <View style={styles.podcastContent}>
            <Text style={styles.podcastTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.podcastSpeaker} numberOfLines={1}>{item.pubDate}</Text>

            <View style={styles.podcastActions}>
                <TouchableOpacity
                    style={styles.playBtn}
                    onPress={() => onPlay(index)}
                >
                    <Ionicons name="play" size={16} color="#fff" />
                    <Text style={styles.playBtnText}>Play</Text>
                </TouchableOpacity>

                <FontAwesome6 name="download" size={22} style={styles.actionIcon} />
                <FontAwesome6 name="share" size={22} style={styles.actionIcon} />
            </View>
        </View>
    </View>
));

export default function AllEpisodes({ navigation, route }: Props) {
    const params = route?.params || {};
    const episodes: Episode[] = params.episodes || [];

    const nav = useNavigation<any>();

    // Memoized callback for playing episodes
    const handlePlay = useCallback((index: number) => {
        nav.navigate("Player", { episodes, index });
    }, [episodes, nav]);

    // Memoized render function
    const renderEpisode = useCallback(({ item, index }: { item: Episode; index: number }) => (
        <EpisodeItem item={item} index={index} onPlay={handlePlay} />
    ), [handlePlay]);

    // Get item layout for better scrolling performance
    const getItemLayout = useCallback((data: any, index: number) => ({
        length: 119, // height of podcastItem (95 + 12 + 12 padding)
        offset: 119 * index,
        index,
    }), []);

    return (
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
        paddingTop: 40,
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
        fontWeight: "700",
    },
    podcastItem: {
        flexDirection: "row",
        marginTop: 15,
        backgroundColor: "#F9F9F9",
        padding: 12,
        borderRadius: 14,
        alignItems: "center",
    },
    podcastImage: {
        width: 95,
        height: 95,
        borderRadius: 14,
    },
    podcastContent: {
        flex: 1,
        marginLeft: 12,
    },
    podcastTitle: {
        fontSize: 15,
        fontWeight: "700",
    },
    podcastSpeaker: {
        color: "gray",
        marginTop: 3,
        fontSize: 12,
    },
    podcastActions: {
        flexDirection: "row",
        marginTop: 10,
        alignItems: "center",
    },
    playBtn: {
        flexDirection: "row",
        backgroundColor: "#A637FF",
        width: 66,
        height: 28,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
    },
    playBtnText: {
        color: "#fff",
        fontWeight: "600",
    },
    actionIcon: {
        marginLeft: 15,
    },
});
