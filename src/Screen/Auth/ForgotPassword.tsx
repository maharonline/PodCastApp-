import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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

export default function ForgotPassword({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      ToastAndroid.show('Please enter your email', ToastAndroid.SHORT);
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    setIsLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      ToastAndroid.show('OTP sent to your email!', ToastAndroid.LONG);
      setStep('verify');
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim()) {
      ToastAndroid.show('Please enter OTP', ToastAndroid.SHORT);
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      ToastAndroid.show('Please enter both passwords', ToastAndroid.SHORT);
      return;
    }

    if (newPassword !== confirmPassword) {
      ToastAndroid.show("Passwords don't match", ToastAndroid.SHORT);
      return;
    }

    if (newPassword.length < 6) {
      ToastAndroid.show(
        'Password must be at least 6 characters',
        ToastAndroid.SHORT,
      );
      return;
    }

    setIsLoading(true);

    // Verify OTP and update password
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery',
    });

    if (error) {
      setIsLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsLoading(false);

    if (updateError) {
      Alert.alert('Error', updateError.message);
    } else {
      ToastAndroid.show('Password reset successful!', ToastAndroid.LONG);
      navigation.navigate('Login');
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
              source={require('../../assets/headphone-dynamic-gradient.png')}
              style={styles.background}
            />

            <Text style={styles.bgTextTop}>NCAS</Text>
            <Text style={styles.bgTextBottom}>CAST</Text>

            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Image
              source={require('../../assets/headphone.png')}
              style={styles.headphone}
              resizeMode="contain"
            />

            <View style={styles.card}>
              <Text style={styles.title}>
                {step === 'email' ? 'Reset Password' : 'Verify OTP'}
              </Text>

              {step === 'email' && (
                <>
                  {/*======= Email Input ======== */}
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

                  {/*===== Send OTP Button ===== */}
                  <TouchableOpacity
                    style={styles.loginBtn}
                    onPress={handleSendOTP}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.loginText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {step === 'verify' && (
                <>
                  <Text style={styles.infoText}>
                    Enter the OTP sent to {email}
                  </Text>

                  {/*======= OTP Input ======== */}
                  <View style={styles.inputBox}>
                    <FontAwesome6
                      name="key"
                      size={20}
                      color="#000"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 8-digit OTP"
                      placeholderTextColor="#000"
                      keyboardType="number-pad"
                      maxLength={8}
                      value={otp}
                      onChangeText={setOtp}
                    />
                  </View>

                  {/*======= New Password Input ======== */}
                  <View style={styles.inputBox}>
                    <FontAwesome6
                      name="lock"
                      size={20}
                      color="#000"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="New Password"
                      placeholderTextColor="#000"
                      secureTextEntry={true}
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                  </View>

                  {/*======= Confirm Password Input ======== */}
                  <View style={styles.inputBox}>
                    <FontAwesome6
                      name="lock"
                      size={20}
                      color="#000"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      placeholderTextColor="#000"
                      secureTextEntry={true}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>

                  {/*===== Reset Password Button ===== */}
                  <TouchableOpacity
                    style={styles.loginBtn}
                    onPress={handleResetPassword}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.loginText}>Reset Password</Text>
                    )}
                  </TouchableOpacity>

                  {/*==== Resend OTP =====*/}
                  <TouchableOpacity onPress={() => setStep('email')}>
                    <Text style={styles.registerText}>
                      Didn't receive OTP?{' '}
                      <Text style={styles.registerLink}>Resend</Text>
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/*==== Back to Login =====*/}
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.registerText}>
                  Remember your password?{' '}
                  <Text style={styles.registerLink}>Sign in</Text>
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
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    resizeMode: 'cover',
  },
  bgTextTop: {
    position: 'absolute',
    top: 161,
    left: 35,
    fontSize: 135,
    fontFamily: 'PublicSans-ExtraBold',
    color: '#FFFFFF80',
    opacity: 0.7,
  },
  bgTextBottom: {
    position: 'absolute',
    top: 282,
    left: -80,
    fontSize: 135,
    fontFamily: 'PublicSans-ExtraBold',
    color: '#FFFFFF80',
    opacity: 0.7,
  },
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center' },
  title: {
    fontSize: 22,
    fontFamily: 'Manrope-Bold',
    color: '#A637FF',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
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
  },
  input: { flex: 1, fontSize: 15, color: '#000', fontFamily: 'Manrope-Medium' },
  logo: { width: 175, height: 60, marginTop: 30 },
  headphone: { width: 318, height: 318, marginTop: 10 },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    elevation: 6,
    marginTop: -10,
    height: '100%',
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
    marginBottom: 12,
  },
  loginText: { fontSize: 16, fontFamily: 'Manrope-Medium', color: 'white' },
  registerText: { textAlign: 'center', marginTop: 10, fontSize: 14 },
  registerLink: { color: '#A637FF', fontWeight: '700' },
});
