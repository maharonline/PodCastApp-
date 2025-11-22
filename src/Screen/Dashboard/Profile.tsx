import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import { useFocusEffect } from "@react-navigation/native";
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

import { useAppSelector, useAppDispatch } from "../../redux/hooks";
import { supabase } from "../../supabase";
import { setLoggedOut, setLoggedIn } from "../../redux/authSlice";
import { store } from "../../redux/store";
import { DatabaseService, LibraryItem } from "../../services/database";

interface Props {
    navigation: any;
}

export default function EditProfile({ navigation }: Props) {
    const { user } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();

    const [username, setUsername] = useState(user?.display_name || user?.name || "");
    const [stats, setStats] = useState({ likedCount: 0, followingCount: 0 });
    const [recentlyPlayed, setRecentlyPlayed] = useState<LibraryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProfileData = async () => {
        console.log("Profile: fetchProfileData called. User ID:", user?.id);

        if (!user?.id) {
            console.log("Profile: No user ID found, stopping fetch.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log("Profile: Starting database fetches...");

            // Create a timeout promise
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timed out")), 10000)
            );

            // Fetch Stats and History in parallel with timeout
            const [statsData, historyData] = await Promise.race([
                Promise.all([
                    DatabaseService.getLibraryStats(user.id),
                    DatabaseService.getLibrary(user.id, 'history')
                ]),
                timeout
            ]) as [any, any];

            console.log("Profile: Database fetches complete.", {
                stats: statsData,
                historyCount: historyData?.length
            });

            setStats(statsData);
            setRecentlyPlayed(historyData || []);
        } catch (error: any) {
            console.error("Profile: Error fetching profile data:", error);
            Alert.alert("Error", "Failed to load profile data: " + error.message);
        } finally {
            console.log("Profile: Setting loading to false");
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProfileData();
        }, [user?.id])
    );

    // Get avatar URL from either direct property or user_metadata (for Google OAuth)
    const avatarUrl = user?.avatar_url || user?.user_metadata?.avatar_url;
    const displayName = user?.display_name || user?.user_metadata?.display_name || user?.name || user?.email;

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
                console.log('ImagePicker Error: ', response.errorMessage);
                Alert.alert('Error', response.errorMessage);
            } else if (response.assets && response.assets.length > 0) {
                const asset = response.assets[0];
                try {
                    setLoading(true);
                    const fileName = asset.fileName || `avatar_${Date.now()}.jpg`;

                    // Upload to Supabase
                    if (!user?.id) throw new Error("User ID not found");
                    const newAvatarUrl = await DatabaseService.uploadAvatar(user.id, asset.uri, fileName);

                    // Update Redux
                    dispatch(setLoggedIn({
                        ...user,
                        avatar_url: newAvatarUrl
                    }));

                    Alert.alert('Success', 'Profile picture updated!');
                } catch (error: any) {
                    console.error('Upload error:', error);
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
            Alert.alert("Error", "User not found");
            return;
        }

        try {
            // Ensure profile exists first
            await DatabaseService.ensureUserProfile(user.id, user.email, username);

            // Update profile in Supabase
            const updatedProfile = await DatabaseService.updateUserProfile(user.id, {
                display_name: username,
            } as any);

            console.log("Profile updated in Supabase:", updatedProfile);

            // Update Redux state
            dispatch(setLoggedIn({
                ...user,
                display_name: username,
            }));

            Alert.alert("Success", "Profile updated successfully!");
        } catch (error: any) {
            console.error("Error updating profile:", error);
            Alert.alert("Error", error.message || "Failed to update profile");
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/*======== HEADER ===========*/}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={26} style={{ marginTop: 30 }} />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>Edit Profile</Text>

                    <View style={{ width: 26 }}>
                        <TouchableOpacity
                            onPress={async () => {
                                try {
                                    const { error } = await supabase.auth.signOut();
                                    if (error) throw error;

                                    store.dispatch(setLoggedOut());

                                    navigation.replace("Login");
                                } catch (error: any) {
                                    Alert.alert("Error", error.message);
                                }
                            }}
                            style={{ width: 26 }}
                        >
                            <Ionicons name="log-out-outline" size={26} color="#000" style={{ marginTop: 30 }} />
                        </TouchableOpacity>

                    </View>

                </View>


                <View style={{ alignItems: "center", marginTop: 40 }}>

                    {/* AVATAR SECTION */}
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={
                                avatarUrl
                                    ? { uri: avatarUrl }
                                    : require("../../assets/headphone.png")
                            }
                            style={styles.avatar}
                        />
                        {/* Edit Avatar Button */}
                        <TouchableOpacity
                            style={styles.editAvatarBtn}
                            onPress={() => {
                                Alert.alert(
                                    "Change Profile Picture",
                                    "Choose an option",
                                    [
                                        {
                                            text: "Take Photo",
                                            onPress: () => handleImagePicker('camera')
                                        },
                                        {
                                            text: "Choose from Gallery",
                                            onPress: () => handleImagePicker('library')
                                        },
                                        {
                                            text: "Cancel",
                                            style: "cancel"
                                        }
                                    ]
                                );
                            }}
                        >
                            <Ionicons name="camera" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/*===== PURPLE CARD ======*/}
                    <View style={styles.profileCard}>
                        <Text style={styles.name}>{displayName}</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{stats.likedCount}</Text>
                                <Text style={styles.statLabel}>Liked Podcasts</Text>
                            </View>

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
                    <ActivityIndicator size="small" color="#A637FF" style={{ marginTop: 20 }} />
                ) : recentlyPlayed.length === 0 ? (
                    <Text style={{ color: "gray", marginTop: 10 }}>No recently played episodes.</Text>
                ) : (
                    recentlyPlayed.map((item, index) => {
                        // Convert database episode format to match PlayerScreen expected format
                        const allEpisodes = recentlyPlayed.map(i => ({
                            id: i.episode.id,
                            title: i.episode.title,
                            description: i.episode.description,
                            audioUrl: i.episode.audio_url,
                            image: i.episode.image_url,
                            pubDate: i.episode.pub_date,
                            duration: i.episode.duration,
                        }));

                        return (
                            <View key={item.id} style={styles.row}>
                                <Text style={styles.number}>{index + 1}.</Text>

                                <View style={styles.podcastCard}>
                                    <Image
                                        source={item.episode.image_url ? { uri: item.episode.image_url } : require("../../assets/pod1.jpg")}
                                        style={styles.podcastImage}
                                    />

                                    <View style={styles.podcastContent}>
                                        <Text style={styles.podcastTitle} numberOfLines={1}>{item.episode.title}</Text>
                                        <Text style={styles.podcastSpeaker} numberOfLines={1}>{item.episode.pub_date}</Text>

                                        <View style={styles.actions}>
                                            <TouchableOpacity
                                                style={styles.playBtn}
                                                onPress={() => navigation.navigate("Player", {
                                                    episodes: allEpisodes,
                                                    index
                                                })}
                                            >
                                                <Ionicons name="play" size={14} color="#fff" />
                                                <Text style={styles.playText}>Play</Text>
                                            </TouchableOpacity>

                                            <FontAwesome6 name="download" size={20} style={styles.icon} />
                                            <Ionicons
                                                name="ellipsis-vertical"
                                                size={20}
                                                style={styles.icon}
                                            />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* SAVE BUTTON */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChanges}>
                <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>
        </View>
    );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        paddingHorizontal: 20,
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        marginTop: 30,
        flex: 1,
    },


    avatarWrapper: {
        position: "absolute",
        zIndex: 10,
        elevation: 10,
        backgroundColor: "#fff",
        width: 130,
        height: 130,
        borderRadius: 65,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },

    },

    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },

    editAvatarBtn: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#A637FF",
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#fff",
    },

    profileCard: {
        backgroundColor: "#A637FF",
        paddingTop: 70,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderRadius: 22,
        alignItems: "center",
        width: 286,
        height: 224,
        marginTop: 60
    },

    name: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
        marginTop: 10,
    },

    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "70%",
        marginTop: 15,
    },

    statBox: { alignItems: "center" },

    statNumber: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    },

    statLabel: {
        color: "#ddd",
        fontSize: 12,
    },

    label: {
        marginTop: 25,
        fontSize: 14,
        color: "gray",
    },

    input: {
        borderWidth: 1,
        borderColor: "#D1C6FF",
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        fontSize: 16,
    },

    sectionTitle: {
        marginTop: 20,
        fontSize: 17,
        fontWeight: "700",
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 15,
    },

    number: {
        width: 25,
        fontSize: 17,
        fontWeight: "700",
        marginRight: 10,
    },

    podcastCard: {
        flexDirection: "row",
        flex: 1,
        backgroundColor: "#F8F8F8",
        padding: 12,
        borderRadius: 14,
    },

    podcastImage: {
        width: 80,
        height: 80,
        borderRadius: 10,
    },

    podcastContent: {
        flex: 1,
        marginLeft: 10,
    },

    podcastTitle: {
        fontSize: 15,
        fontWeight: "700",
    },

    podcastSpeaker: {
        color: "gray",
        marginTop: 2,
    },

    actions: {
        flexDirection: "row",
        marginTop: 10,
        alignItems: "center",
    },

    playBtn: {
        backgroundColor: "#A637FF",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        height: 28,
        borderRadius: 20,
    },

    playText: {
        color: "#fff",
        marginLeft: 4,
        fontWeight: "600",
        fontSize: 12,
    },

    icon: {
        marginLeft: 15,
    },

    saveBtn: {
        position: "absolute",
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: "black",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },

    saveText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});
