import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Circle, Svg } from "react-native-svg";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";

interface Episode {
    title: string;
    description: string;
    pubDate: string;
    audioUrl: string | null;
    image: string;
}
export const EpisodeItem = React.memo(({ item, index, onPlay, onDownload, downloading, downloadProgress, isDownloaded }: {
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
))


const styles = StyleSheet.create({
    podcastItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    podcastImage: {
        width: 64,
        height: 64,
        marginRight: 16,
    },
    podcastContent: {
        flex: 1,
    },
    podcastTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    podcastSpeaker: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    podcastActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    playBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 24,
    },
    playBtnText: {
        color: '#fff',
        marginLeft: 8,
    },
    actionIconsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIcon: {
        marginHorizontal: 8,
    },
    downloadedContainer: {
        backgroundColor: '#4CAF50',
        padding: 8,
        borderRadius: 24,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressText: {
        marginLeft: 8,
    },
})