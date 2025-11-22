// import React, { useState } from "react";
// import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput,KeyboardAvoidingView, Platform, Alert  } from "react-native";
// import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
// import { setLoggedIn } from "../../redux/authSlice";
// import { supabase } from "../../supabase";
// import { useAppDispatch } from "../../redux/hooks";

// interface Props {
//   navigation: any;
// }



// export default function Login({ navigation }: Props) {
//   const dispatch = useAppDispatch();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const handleLogin = async () => {
//     try {
//       const { data, error } = await supabase.auth.signInWithPassword({
//         email,
//         password,
//       });

//       if (error) throw error;

//       if (data.user) {
//         // Redux update
//         dispatch(
//           setLoggedIn({
//             id: data.user.id,
//             email: data.user.email,
//             display_name: data.user.user_metadata?.display_name || "",
//             avatar_url: data.user.user_metadata?.avatar_url || "",
//           })
//         );
//       }

//     } catch (error: any) {
//       Alert.alert("Login Error", error.message);
//     }
//   };

//   return (
//     <KeyboardAvoidingView
//       style={{ flex: 1 }}
//       behavior={Platform.OS === "ios" ? "padding" : "height"}
//     >
//       <ScrollView
//         contentContainerStyle={{ flexGrow: 1 }}
//         keyboardShouldPersistTaps="handled"
//       >

//       <View style={styles.container}>
//         {/*===== LOGO =====*/}
//         <Image
//           source={require("../../assets/logo.png")}
//           style={styles.logo}
//           resizeMode="contain"
//         />

//         {/*===== HEADPHONE IMAGE ======*/}
//         <Image
//           source={require("../../assets/headphone.png")}
//           style={styles.headphone}
//           resizeMode="contain"
//         />

//         {/*===== BOTTOM BOX ======*/}
//         <View style={styles.card}>

//           {/*======= Email INput ======== */}
//           <View style={styles.inputBox}>
//             <FontAwesome6 name="envelope" size={20} color="#A637FF" style={{ marginRight: 10 }} />

//             <TextInput style={styles.input} placeholder="Enter your Email" placeholderTextColor="#A637FF"
//               keyboardType="email-address"
//               autoCapitalize="none"
//               autoCorrect={false}
//             />
//           </View>
//           {/*======= Password INput ======== */}
//           <View style={styles.inputBox}>
//             <FontAwesome6 name="lock" size={20} color="#A637FF" style={{ marginRight: 10 }} />

//             <TextInput style={styles.input} placeholder="Enter your Password" placeholderTextColor="#A637FF"
//               secureTextEntry={true}
//             />
//           </View>



//           {/*===== Login Button ===== */}

//           <TouchableOpacity style={styles.loginBtn}>
//             {/* <FontAwesome6 name="google" size={22} color="#4285F4" /> */}
//             <Text style={styles.loginText} onPress={handleLogin}>Login</Text>
//           </TouchableOpacity>

        

//           {/*==== Navigation to Register Page =====*/}
//           <TouchableOpacity onPress={() => navigation.navigate("Register")}>
//             <Text style={styles.registerText}>
//               Create a new account?{" "}
//               <Text style={styles.registerLink}>Register</Text>
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }

// // =============== StyleSheet ====================
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#fff",
//     alignItems: "center",
//   },

//   inputBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#EDEDED",
//     borderRadius: 10,
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     marginBottom: 12,
//   },

//   input: {
//     flex: 1,
//     fontSize: 15,
//     color: "#A637FF",
//   },



//   logo: {
//     width: 175,
//     height: 60,
//     marginTop: 50,
//   },

//   headphone: {
//     width: 318,
//     height: 318,
//     marginTop: 10,
//   },

//   card: {
//     width: "100%",
//     backgroundColor: "#fff",
//     padding: 20,
//     borderRadius: 20,
//     elevation: 6,
//     marginTop: -10,
//     height: "100%"
//   },

//   emailInput: {
//     flexDirection: "row",
//     backgroundColor: "#EDEDED",
//     color: "#A637FF",
//     padding: 14,
//     paddingVertical: 20,
//     borderRadius: 10,
//     alignItems: "center",
//     justifyContent: "center",
//   },

//   emailText: {
//     fontSize: 16,
//     marginLeft: 8,
//     fontWeight: "600",
//   },

//   orText: {
//     textAlign: "center",
//     marginVertical: 16,
//     opacity: 0.5,
//   },

//   loginBtn: {
//     flexDirection: "row",
//     borderWidth: 1,
//     borderColor: "#A637FF",
//     backgroundColor:"#A637FF",
//     padding: 14,
//     borderRadius: 10,
//     alignItems: "center",
//     justifyContent: "center",
//     marginBottom: 12,
//   },

//   loginText: {
//     fontSize: 16,
//     marginLeft: 10,
//     fontWeight: "600",
//     color:'white'
//   },

//   registerText: {
//     textAlign: "center",
//     marginTop: 10,
//     fontSize: 14,
//   },

//   registerLink: {
//     color: "#A637FF",
//     fontWeight: "700",
//   },
// });


import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import { supabase } from "../../supabase";
import { useAppDispatch } from "../../redux/hooks";
import { setLoggedIn } from "../../redux/authSlice";

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
        // Redux update
        dispatch(
          setLoggedIn({
            id: data.user.id,
            email: data.user.email,
            display_name: data.user.user_metadata?.display_name || "",
            avatar_url: data.user.user_metadata?.avatar_url || "",
          })
        );
      }

    } catch (error: any) {
      Alert.alert("Login Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/*===== LOGO =====*/}
          <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />

          {/*===== HEADPHONE IMAGE =====*/}
          <Image source={require("../../assets/headphone.png")} style={styles.headphone} resizeMode="contain" />

          {/*===== BOTTOM BOX =====*/}
          <View style={styles.card}>
            {/*======= Email INput ======== */}
            <View style={styles.inputBox}>
              <FontAwesome6 name="envelope" size={20} color="#A637FF" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Enter your Email"
                placeholderTextColor="#A637FF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>
            {/*======= Password INput ======== */}
            <View style={styles.inputBox}>
              <FontAwesome6 name="lock" size={20} color="#A637FF" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Enter your Password"
                placeholderTextColor="#A637FF"
                secureTextEntry={true}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/*===== Login Button ===== */}
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
              <Text style={styles.loginText}>{isLoading?"Logging In......":"Login"}</Text>
            </TouchableOpacity>

            {/*==== Navigation to Register Page =====*/}
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.registerText}>
                Create a new account? <Text style={styles.registerLink}>Register</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center" },
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#EDEDED", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  input: { flex: 1, fontSize: 15, color: "#A637FF" },
  logo: { width: 175, height: 60, marginTop: 50 },
  headphone: { width: 318, height: 318, marginTop: 10 },
  card: { width: "100%", backgroundColor: "#fff", padding: 20, borderRadius: 20, elevation: 6, marginTop: -10, height: "100%" },
  loginBtn: { flexDirection: "row", borderWidth: 1, borderColor: "#A637FF", backgroundColor: "#A637FF", padding: 14, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  loginText: { fontSize: 16, marginLeft: 10, fontWeight: "600", color: "white" },
  registerText: { textAlign: "center", marginTop: 10, fontSize: 14 },
  registerLink: { color: "#A637FF", fontWeight: "700" },
});
