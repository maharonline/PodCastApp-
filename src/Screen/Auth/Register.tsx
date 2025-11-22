import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Linking } from "react-native";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';
import { supabase } from "../../supabase"; 
import { useAppDispatch } from "../../redux/hooks";
import { setLoggedIn } from "../../redux/authSlice";



interface Props {
  navigation: any;
}

export default function Register({ navigation }: Props) {
  const dispatch = useAppDispatch();

  const handleRegister = (): void => {
    navigation.navigate("RegisterForm");
  }

  
 // ===== Configure Google Signin =====
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '476306397132-4s0f8ts8mirt6bqdnubmm4flct6hvvqn.apps.googleusercontent.com',
      offlineAccess: true,
      scopes: ['email', 'profile'],
        forceCodeForRefreshToken: true,


    });
  }, []);

  // ===== Google Sign In =====
const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();       
      const res = await GoogleSignin.signIn();

      if (!res.data?.idToken) throw new Error("No ID token from Google");

      // Supabase sign in with Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: res.data?.idToken!,
      });

      if (error) {
        console.log("Supabase login error:", error);
        Alert.alert("Error", error.message);
        return;
      }

        if (data.session?.user) {
      dispatch(
        setLoggedIn({
          id: data.session.user.id,
          name: data.session.user.user_metadata?.full_name || "Unknown",
          email: data.session.user.email || "",
          photo: data.session.user.user_metadata?.avatar_url || "",
        })
      );
    }

      //Navigate to Home
       navigation.replace("Root");

      Alert.alert("Success", `Welcome ${data.session?.user?.email}`);
    } catch (error: any) {
      console.log("Google Sign-In error:", error);
      Alert.alert("Error", error.message);
    }
  };


  // ===== Apple Sign In =====
const handleAppleSignIn = async () => {
  try {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [
        appleAuth.Scope.EMAIL,
        appleAuth.Scope.FULL_NAME
      ],
    });

    console.log("Apple Response:", response);

    const { user, email, fullName, identityToken } = response;

    if (!identityToken) {
      Alert.alert("Error", "Apple Sign-in failed. Try again.");
      return;
    }

    // Yahan supabase ka call lagega ↓
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: identityToken,
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Success", "Apple Sign-In Successful!");
  } catch (error) {
    console.log("Apple Error:", error);
    Alert.alert("Error", "Apple Sign-in cancelled or failed.");
  }
};

  return (
    <ScrollView>

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
          {/*===== Email Sign Up =====*/}
          <TouchableOpacity style={styles.emailBtn} onPress={handleRegister}>
            {/* <FontAwesome6 name="envelope" size={22} color="#000" /> */}
            <Image
          source={require("../../assets/message.png")}
          style={{ width: 24, height: 24 }}
          
        />
            <Text style={styles.emailText}>Sign up with email</Text>

          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.line} />
            <Text style={styles.orText}> or continue with</Text>
            <View style={styles.line} />
          </View>

          {/*===== Google Signup ===== */}

          <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignIn}>
            {/* <FontAwesome6 name="google" size={22} color="#4285F4" /> */}
           <Image
          source={require("../../assets/google.png")}
          style={{ width: 24, height: 24 }}
          
        />
            <Text style={styles.socialText}>Sign up with Google</Text>
          </TouchableOpacity>

          {/*===== Apple Signup ======*/}
          <TouchableOpacity style={styles.socialBtn} onPress={handleAppleSignIn}>
            {/* <FontAwesome6 name="apple" size={22} color="#000" /> */}
             <Image
          source={require("../../assets/apple.png")}
          style={{ width: 24, height: 24 }}
          
        />
            <Text style={styles.socialText}>Sign up with Apple</Text>
          </TouchableOpacity>

          {/*==== Navigation to Login Page =====*/}
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginText}>
              Already have an account?{" "}
              <Text style={styles.loginLink}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// =============== StyleSheet ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
  },


  logo: {
    width: 175,
    height: 60,
    marginTop: 50,
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

  emailBtn: {
    flexDirection: "row",
    backgroundColor: "#EDEDED",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  emailText: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: "600",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },

  orText: {
    marginHorizontal: 10,
    opacity: 0.2,
    textAlign: "center",
  },

  socialBtn: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#8D5CF6",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  socialText: {
    fontSize: 16,
    marginLeft: 10,
    fontWeight: "600",
  },

  loginText: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },

  loginLink: {
    color: "#6C45FF",
    fontWeight: "700",
  },
});
