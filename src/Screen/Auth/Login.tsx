import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, ImageBackground, ActivityIndicator, ToastAndroid } from "react-native";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import { supabase } from "../../supabase";
import { useAppDispatch } from "../../redux/hooks";
import { setLoggedIn } from "../../redux/authSlice";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  navigation: any;
}

export default function Login({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch profile from database
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // Redux update
        dispatch(
          setLoggedIn({
            id: data.user.id,
            email: data.user.email,
            display_name: profileData?.display_name || data.user.user_metadata?.display_name || "",
            avatar_url: profileData?.avatar_url || data.user.user_metadata?.avatar_url || "",
            user_metadata: {
              ...data.user.user_metadata,
              avatar_url: profileData?.avatar_url || data.user.user_metadata?.avatar_url
            }
          })
        );
      }
      ToastAndroid.show("Login Successful", ToastAndroid.SHORT);
    } catch (error: any) {
      Alert.alert("Login Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>

            <Image source={require("../../assets/headphone-dynamic-gradient.png")} style={styles.background} />

            <Text style={styles.bgTextTop}>NCAS</Text>
            <Text style={styles.bgTextBottom}>CAST</Text>

            {/*===== LOGO =====*/}
            <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />

            {/*===== HEADPHONE IMAGE =====*/}
            <Image source={require("../../assets/headphone.png")} style={styles.headphone} resizeMode="contain" />

            {/*===== BOTTOM BOX =====*/}
            <View style={styles.card}>


              {/*======= Email INput ======== */}
              <View style={styles.inputBox}>
                <FontAwesome6 name="envelope" size={20} color="#000" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your Email"
                  placeholderTextColor="#000"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              {/*======= Password INput ======== */}
              <View style={styles.inputBox}>
                <FontAwesome6 name="lock" size={20} color="#000" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your Password"
                  placeholderTextColor="#000"
                  secureTextEntry={true}
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {/*==== Forgot Password Link =====*/}
              <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={styles.forgotText}>Forgot your password?</Text>
              </TouchableOpacity>



              {/*===== Login Button ===== */}
              <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={isLoading} >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.loginText}>Sign In</Text>
                )}
              </TouchableOpacity>

              {/*==== Navigation to Register Page =====*/}
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.registerText}>
                  Create a new account? <Text style={styles.registerLink}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    resizeMode: "cover",

  },
  bgTextTop: {
    position: "absolute",
    top: 161,
    left: 35,
    fontSize: 135,
    fontFamily: "PublicSans-ExtraBold",
    color: "#FFFFFF80",
    opacity: 0.7,
  },
  bgTextBottom: {
    position: "absolute",
    top: 282,
    left: -80,
    fontSize: 135,
    fontFamily: "PublicSans-ExtraBold",
    color: "#FFFFFF80",
    opacity: 0.7,
  },

  container: { flex: 1, backgroundColor: "#fff", alignItems: "center" },
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#EDEDED", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: "#A637FF" },
  input: { flex: 1, fontSize: 15, color: "#000", fontFamily: 'Manrope-Medium' },
  logo: { width: 175, height: 60, marginTop: 30 },
  headphone: { width: 318, height: 318, marginTop: 10 },
  card: { width: "100%", backgroundColor: "#fff", padding: 20, borderRadius: 20, elevation: 6, marginTop: -10, height: "100%" },
  loginBtn: { flexDirection: "row", borderWidth: 1, borderColor: "#A637FF", backgroundColor: "#A637FF", padding: 14, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  loginText: { fontSize: 16, marginLeft: 10, fontFamily: 'Manrope-Medium', color: "white" },
  registerText: { textAlign: "center", marginTop: 0, fontSize: 14 },
  registerLink: { color: "#A637FF", fontFamily: 'Manrope-Medium' },
  forgotText: {
    textAlign: "right",
    marginTop: 5,
    paddingBottom: 10,
    fontSize: 14,
    color: "#A637FF",
    fontFamily: 'Manrope-Medium'
  },

});
