import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import { supabase } from '../../supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  navigation: any;
}

export default function RegisterForm({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name,
          },
        },
      });

      if (error) {
        Alert.alert('Error', error.message);

        return; // yaha stop ho jaye ga
      }

      // Create profile entry in profiles table
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email || email,
          display_name: name,
          avatar_url: '',
        });

        if (profileError && !profileError.message.includes('duplicate key')) {

          // Don't block registration if profile creation fails
        }
      }

      ToastAndroid.show(
        `User registered: ${data.user?.email}`,
        ToastAndroid.LONG,
      );

      navigation.navigate('Login');
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Image
              source={require('../../assets/headphone_dynamic_gradient.png')}
              style={styles.background}
            />

            <Text style={styles.bgTextTop}>NCAS</Text>
            <Text style={styles.bgTextBottom}>CAST</Text>
            {/*===== LOGO =====*/}
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            {/*===== HEADPHONE IMAGE ======*/}
            <Image
              source={require('../../assets/headphone.png')}
              style={styles.headphone}
              resizeMode="contain"
            />

            {/*===== BOTTOM BOX ======*/}
            <View style={styles.card}>
              {/*======= Name INput ======== */}
              <View style={styles.inputBox}>
                <FontAwesome6
                  name="user"
                  size={20}
                  color="#000"
                  style={{ marginRight: 10 }}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Enter your Name"
                  placeholderTextColor="#000"
                  value={name}
                  onChangeText={setName}
                />
              </View>
              {/*======= Email INput ======== */}
              <View style={styles.inputBox}>
                <FontAwesome6
                  name="envelope"
                  size={20}
                  color="#000"
                  style={{ marginRight: 10 }}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Enter your Email"
                  placeholderTextColor="#000"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              {/*======= Password INput ======== */}
              <View style={styles.inputBox}>
                <FontAwesome6
                  name="lock"
                  size={20}
                  color="#000"
                  style={{ marginRight: 10 }}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Enter your Password"
                  placeholderTextColor="#000"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {/*===== Login Button ===== */}

              <TouchableOpacity
                style={styles.loginBtn}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.loginText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              {/*==== Navigation to Register Page =====*/}
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.registerText}>
                  Create a new account?{' '}
                  <Text style={styles.registerLink}>Singin</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =============== StyleSheet ====================
const styles = StyleSheet.create({
  background: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    resizeMode: 'cover',
  },
  bgTextTop: {
    position: 'absolute',
    top: 150,
    left: 35,
    fontSize: 120,
    fontFamily: 'PublicSans-ExtraBold',
    color: '#FFFFFF80',
    opacity: 0.7,
  },
  bgTextBottom: {
    position: 'absolute',
    top: 250,
    left: -10,
    fontSize: 120,
    fontFamily: 'PublicSans-ExtraBold',
    color: '#FFFFFF80',
    opacity: 0.7,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDEDED',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A637FF',
    color: '#000',
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontFamily: 'Manrope-Medium',
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
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    elevation: 6,
    marginTop: -10,
    height: '100%',
  },

  emailInput: {
    flexDirection: 'row',
    backgroundColor: '#EDEDED',
    color: '#000',
    padding: 14,
    paddingVertical: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Manrope-Medium',
  },

  emailText: {
    fontSize: 16,
    marginLeft: 8,
    fontFamily: 'Manrope-Medium',
  },

  orText: {
    textAlign: 'center',
    marginVertical: 16,
    opacity: 0.5,
  },

  loginBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#A637FF',
    backgroundColor: '#A637FF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  loginText: {
    fontSize: 16,
    marginLeft: 10,
    fontFamily: 'Manrope-Medium',
    color: 'white',
  },

  registerText: {
    textAlign: 'center',
    // marginTop: 10,
    fontSize: 14,
  },

  registerLink: {
    color: '#A637FF',
    fontFamily: 'Manrope-Medium',
  },
});
