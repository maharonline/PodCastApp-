import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform, TextInput, Alert } from "react-native";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import { supabase } from "../../supabase";
import { SafeAreaView } from "react-native-safe-area-context";


interface Props {
    navigation: any;
}

export default function RegisterForm({ navigation }: Props) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);


    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        try {
            setIsLoading(true);

            const { data, error } = await supabase.auth.signUp(
                {
                    email,
                    password,
                    options: {
                        data: {
                            display_name: name,
                        },
                    },
                }
            );

            if (error) {
                Alert.alert("Error", error.message);
                console.log("Supabase register error:", error);
                return; // yaha stop ho jaye ga
            }

            // Create profile entry in profiles table
            if (data.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        email: data.user.email || email,
                        display_name: name,
                        avatar_url: ''
                    });

                if (profileError && !profileError.message.includes('duplicate key')) {
                    console.error('Error creating profile:', profileError);
                    // Don't block registration if profile creation fails
                }
            }

            Alert.alert("Success", `User registered: ${data.user?.email}`);
            console.log("Registered user:", data.user);

            navigation.navigate("Login");

        } catch (err) {
            console.log("Unexpected error:", err);
            Alert.alert("Error", "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={['top']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >

                    <View style={styles.container}>
                        {/*===== LOGO =====*/}
                        <Image
                            source={require("../../assets/logo.png")}
                            style={styles.logo}
                            resizeMode="contain"
                        />

                        {/*===== HEADPHONE IMAGE ======*/}
                        <Image
                            source={require("../../assets/headphone.png")}
                            style={styles.headphone}
                            resizeMode="contain"
                        />

                        {/*===== BOTTOM BOX ======*/}
                        <View style={styles.card}>

                            {/*======= Name INput ======== */}
                            <View style={styles.inputBox}>
                                <FontAwesome6 name="user" size={20} color="#A637FF" style={{ marginRight: 10 }} />

                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your Name"
                                    placeholderTextColor="#A637FF"
                                    value={name}
                                    onChangeText={setName}
                                />

                            </View>
                            {/*======= Email INput ======== */}
                            <View style={styles.inputBox}>
                                <FontAwesome6 name="envelope" size={20} color="#A637FF" style={{ marginRight: 10 }} />

                                <TextInput style={styles.input}
                                    placeholder="Enter your Email"
                                    placeholderTextColor="#A637FF"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                            {/*======= Password INput ======== */}
                            <View style={styles.inputBox}>
                                <FontAwesome6 name="lock" size={20} color="#A637FF" style={{ marginRight: 10 }} />

                                <TextInput style={styles.input}
                                    placeholder="Enter your Password"
                                    placeholderTextColor="#A637FF"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                />
                            </View>



                            {/*===== Login Button ===== */}

                            <TouchableOpacity style={styles.loginBtn}>
                                {/* <FontAwesome6 name="google" size={22} color="#4285F4" /> */}
                                <Text style={styles.loginText} onPress={handleRegister}>{isLoading ? "Singing IN....." : "Sign In"}</Text>
                            </TouchableOpacity>



                            {/*==== Navigation to Register Page =====*/}
                            {/* <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                            <Text style={styles.registerText}>
                                Create a new account?{" "}
                                <Text style={styles.registerLink}>Register</Text>
                            </Text>
                        </TouchableOpacity> */}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// =============== StyleSheet ====================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
    },

    inputBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EDEDED",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 12,
    },

    input: {
        flex: 1,
        fontSize: 15,
        color: "#A637FF",
    },



    logo: {
        width: 175,
        height: 60,
        marginTop: 20,
    },

    headphone: {
        width: 318,
        height: 318,
        marginTop: 10,
    },

    card: {
        width: "100%",
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 20,
        elevation: 6,
        marginTop: -10,
        height: "100%"
    },

    emailInput: {
        flexDirection: "row",
        backgroundColor: "#EDEDED",
        color: "#A637FF",
        padding: 14,
        paddingVertical: 20,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },

    emailText: {
        fontSize: 16,
        marginLeft: 8,
        fontWeight: "600",
    },

    orText: {
        textAlign: "center",
        marginVertical: 16,
        opacity: 0.5,
    },

    loginBtn: {
        flexDirection: "row",
        borderWidth: 1,
        borderColor: "#A637FF",
        backgroundColor: "#A637FF",
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },

    loginText: {
        fontSize: 16,
        marginLeft: 10,
        fontWeight: "600",
        color: 'white'
    },

    registerText: {
        textAlign: "center",
        marginTop: 10,
        fontSize: 14,
    },

    registerLink: {
        color: "#A637FF",
        fontWeight: "700",
    },
});
