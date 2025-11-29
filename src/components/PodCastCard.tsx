import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import { Svg, Circle } from "react-native-svg";

interface PodcastCardProps {
    item: any; // episode or library item
    onPlay: () => void;
    onDownload: () => void;
    downloading: boolean;
    downloadProgress: number;
    isDownloaded: boolean;
}

export default function PodcastCard({
    item,
    onPlay,
    onDownload,
    downloading,
    downloadProgress,
    isDownloaded,
}: PodcastCardProps) {
    const imageUrl = item.image || item.image_url || item.episode?.image_url || "https://via.placeholder.com/100";



    return (
        <View style={styles.podcastItem}>
            <Image source={{ uri: imageUrl }} style={styles.podcastImage} />

            <View style={styles.podcastContent}>
                <Text style={styles.podcastTitle} numberOfLines={2}>
                    {item.title || item.episode?.title}
                </Text>
                <Text style={styles.podcastSpeaker} numberOfLines={1}>

                    {item.pubDate || item.episode?.pub_date}
                </Text>

                <View style={styles.podcastActions}>
                    {/* Play Button */}
                    <TouchableOpacity style={styles.playBtn} onPress={onPlay}>
                        <Ionicons name="play" size={16} color="#fff" />
                        <Text style={styles.playBtnText}>Play</Text>
                    </TouchableOpacity>

                    {/* Download / Progress / Check */}
                    {isDownloaded ? (
                        <View style={styles.downloadedContainer}>
                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        </View>
                    ) : (
                        <TouchableOpacity onPress={onDownload} disabled={downloading}>
                            {downloading ? (
                                <View style={styles.progressContainer}>
                                    <Svg width="24" height="24" viewBox="0 0 24 24">
                                        <Circle cx="12" cy="12" r="10" stroke="#E0E0E0" strokeWidth="2" fill="none" />
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
                                <Feather name="download" size={20} style={styles.actionIcon} />
                            )}
                        </TouchableOpacity>
                    )}

                    {/* More / Share */}
                    <Feather name="share-2" size={20} style={styles.actionIcon} />
                    <Feather name="more-vertical" size={20} style={styles.actionIcon} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    podcastItem: { flexDirection: "row", marginTop: 20, backgroundColor: "#F9F9F9", padding: 12, borderRadius: 14, alignItems: "center" },
    podcastImage: { width: 95, height: 95, borderRadius: 14 },
    podcastContent: { flex: 1, marginLeft: 12 },
    podcastTitle: { fontSize: 15, fontWeight: "700" },
    podcastSpeaker: { color: "gray", marginTop: 3 },
    podcastActions: { flexDirection: "row", marginTop: 10, alignItems: "center", justifyContent: "space-between" },
    playBtn: { flexDirection: "row", backgroundColor: "#A637FF", width: 66, height: 28, borderRadius: 25, justifyContent: "center", alignItems: "center" },
    playBtnText: { color: "#fff", fontWeight: "600", marginLeft: 5 },
    actionIcon: { marginLeft: 15, color: "#000" },
    progressContainer: { position: "relative", width: 24, height: 24, justifyContent: "center", alignItems: "center", marginLeft: 15 },
    progressText: { position: "absolute", fontSize: 8, fontWeight: "700", color: "#4CAF50" },
    downloadedContainer: { marginLeft: 15 },
});
