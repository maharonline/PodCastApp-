import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import { Svg, Circle } from 'react-native-svg';
import { DownloadManager } from '../controller/DownloadManger';
import { PodcastCardProps } from '../types';
import { COLORS } from '../constants/colors';

export default function PodcastCard({
  item,
  onPlay,
  userId,
  isDownloaded,
  onDownloadComplete,
}: PodcastCardProps) {
  // Internal state for download progress
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const imageUrl =
    item.image ||
    item.episode?.image ||
    item.image_url ||
    item.episode?.image_url;
  const imageSource = imageUrl
    ? { uri: imageUrl }
    : require('../assets/headphone.png');

  // Share Function
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this podcast: ${
          item.title || item.episode?.title
        }\nListen here: ${item.audioUrl || item.episode?.audio_url}`,
      });
    } catch (error) {
      // Share error
    }
  };

  // Download Function - Self-contained
  const handleDownload = async () => {
    if (!userId || isDownloaded) return;

    const episodeToDownload = item.episode || item;

    setDownloading(true);

    try {
      await DownloadManager.downloadEpisode(userId, episodeToDownload, {
        onProgress: (percent: number) => {
          setProgress(percent);
        },
        onComplete: () => {
          setDownloading(false);
          setProgress(0);
          onDownloadComplete?.(); // Notify parent to refresh
        },
      });
    } catch (error) {
      setDownloading(false);
      setProgress(0);
    }
  };

  return (
    <View style={styles.podcastItem}>
      <Image source={imageSource} style={styles.podcastImage} />

      <View style={styles.podcastContent}>
        <Text style={styles.podcastTitle} numberOfLines={2}>
          {item.title || item.episode?.title}
        </Text>
        <Text style={styles.podcastSpeaker} numberOfLines={1}>
          {item.pubDate ||
            item.pub_date ||
            item.episode?.pub_date ||
            item.episode?.pubDate}
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
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={COLORS.SUCCESS}
              />
            </View>
          ) : (
            <TouchableOpacity onPress={handleDownload} disabled={downloading}>
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
                      stroke={COLORS.SUCCESS}
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 10}`}
                      strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 12 12)"
                    />
                  </Svg>
                  <Text style={styles.progressText}>
                    {Math.round(progress * 100)}%
                  </Text>
                </View>
              ) : (
                // <Image source={require("../assets/Download.png")} style={styles.actionIcon} />
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={24}
                  style={styles.actionIcon}
                />
              )}
            </TouchableOpacity>
          )}

          {/* Share Button */}
          <TouchableOpacity onPress={handleShare}>
            <Feather name="share-2" size={20} style={styles.actionIcon} />
          </TouchableOpacity>

          {/* More Button */}
          <Feather name="more-vertical" size={20} style={styles.actionIcon} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  podcastItem: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  podcastImage: { width: 100, height: 100, borderRadius: 14 },
  podcastContent: { flex: 1, marginLeft: 12 },
  podcastTitle: { fontSize: 14, fontFamily: 'Inter-Regular' },
  podcastSpeaker: { color: 'gray', marginTop: 3, fontFamily: 'Inter-Regular' },
  podcastActions: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.PRIMARY,
    width: 66,
    height: 28,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnText: { color: '#fff', fontFamily: 'Inter-Bold', marginLeft: 5 },
  actionIcon: { marginLeft: 15, color: '#000' },
  progressContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  progressText: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.SUCCESS,
  },
  downloadedContainer: { marginLeft: 15 },
});
