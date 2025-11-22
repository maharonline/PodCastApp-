import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, TextInput } from "react-native";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function Search() {
  const trendingimages = [
    { img: require("../../assets/search1.png"), title: "Mind of an Entrepre...", description: "Business" },
    { img: require("../../assets/search2.png"), title: "Unravelling the Mind", description: "Healthy Lifestyle" },
    { img: require("../../assets/search3.png"), title: "A Tale of Writer", description: "Educational" },
    { img: require("../../assets/search4.png"), title: "Addiction to Social!", description: "Sociology" },
  ];

  const podcasterList = [
    { title: "13: Bastian Antony | The Job Search Secrets", speaker: "BAA | 23 Mins", image: require("../../assets/pod1.jpg") },
    { title: "14: Isabel Mercado | Beyond Limits: Women's Ambitions", speaker: "Isabel Mercado | 27 Mins", image: require("../../assets/pod2.jpg") },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
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
        />
      </View>

      {/* Trending Grid */}
      <View style={styles.grid}>
        {trendingimages.map((item, index) => (
          <View key={index} style={styles.trendingItem}>
            <Image source={item.img} style={styles.trendingImage} />
            <Text style={styles.trendingTitle}>{item.title}</Text>
            <Text style={styles.trendingDescription}>{item.description}</Text>
          </View>
        ))}
      </View>

      {/* Podcast List Items */}
      {podcasterList.map((item, index) => (
        <View key={index} style={styles.podcastItem}>
          <Image source={item.image} style={styles.podcastImage} />
          <View style={styles.podcastContent}>
            <Text style={styles.podcastTitle}>{item.title}</Text>
            <Text style={styles.podcastSpeaker}>{item.speaker}</Text>
            <View style={styles.podcastActions}>
              <TouchableOpacity style={styles.playBtn}>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.playBtnText}>Play</Text>
              </TouchableOpacity>
              <FontAwesome6 name="download" size={22} style={styles.actionIcon} />
              <FontAwesome6 name="share" size={22} style={styles.actionIcon} />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

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
    marginTop: 40,
  },
  input: { flex: 1, fontSize: 15, color: "#1F1F1F" },

  /* Trending Grid */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  trendingItem: { width: "48%", marginBottom: 15 },

  trendingImage: { width: "100%", height: 145, borderRadius: 16 },
  trendingTitle: { fontSize: 14, fontWeight: "600", marginTop: 5 },
  trendingDescription: { fontSize: 12, color: "gray" },

  /* Podcast List */
  podcastItem: { flexDirection: "row", marginTop: 0, backgroundColor: "#F9F9F9", padding: 4, borderRadius: 14, alignItems: "center" },
  podcastImage: { width: 95, height: 95, borderRadius: 14 },
  podcastContent: { flex: 1, marginLeft: 12 },
  podcastTitle: { fontSize: 15, fontWeight: "700" },
  podcastSpeaker: { color: "gray", marginTop: 3 },
  podcastActions: { flexDirection: "row", marginTop: 10, alignItems: "center" },
  playBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: "#A637FF", width: 66, height: 28, borderRadius: 25 },
  playBtnText: { color: "#fff", fontWeight: "600" },
  actionIcon: { marginLeft: 15 },
});
