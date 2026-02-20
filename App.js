import 'react-native-gesture-handler';
import React, { useState } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform,
} from 'react-native';

// Klasör yolları src altına çekildi
import { login, extractError } from './src/services/api';
import { C, F, R, S } from './src/constants/theme';

import TablesScreen from './src/screens/TablesScreen';
import OrderScreen  from './src/screens/OrderScreen';
import AdminScreen  from './src/screens/AdminScreen';

const Stack = createStackNavigator();

const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: C.bgDark,
    card:       C.bgMid,
    text:       C.txtPrimary,
    border:     'transparent',
  },
};

function LoginScreen({ onLogin }) {
  const [user,    setUser]    = useState('');
  const [pass,    setPass]    = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!user.trim() || !pass) { 
      Alert.alert('Uyarı', 'Kullanıcı adı ve şifre girin.'); 
      return; 
    }
    setLoading(true);
    try {
      await login(user.trim(), pass);
      onLogin();
    } catch (e) {
      Alert.alert('Giriş Başarısız', extractError(e) || 'Kullanıcı adı veya şifre yanlış.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={loginStyles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <View style={loginStyles.card}>
        <Text style={loginStyles.logo}>☕</Text>
        <Text style={loginStyles.title}>Kafe POS</Text>
        <Text style={loginStyles.subtitle}>Giriş Yapın</Text>

        <TextInput
          style={loginStyles.input}
          placeholder="Kullanıcı adı"
          placeholderTextColor={C.txtDim}
          value={user}
          onChangeText={setUser}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Şifre"
          placeholderTextColor={C.txtDim}
          value={pass}
          onChangeText={setPass}
          secureTextEntry
        />

        <TouchableOpacity
          style={loginStyles.btn}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color={C.bgDark} />
            : <Text style={loginStyles.btnTxt}>Giriş Yap</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const loginStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgDark, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: C.bgMid,
    borderRadius: R.xl,
    padding: 32,
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    ...S.card,
  },
  logo:     { fontSize: 56, marginBottom: 8 },
  title:    { fontSize: F.xxl, fontWeight: '900', color: C.txtPrimary, letterSpacing: 1 },
  subtitle: { fontSize: F.sm, color: C.txtSecond, marginBottom: 28, marginTop: 4 },
  input: {
    width: '100%',
    backgroundColor: C.bgLight,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: F.md,
    color: C.txtPrimary,
    marginBottom: 12,
  },
  btn: {
    width: '100%',
    backgroundColor: C.amber,
    borderRadius: R.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnTxt: { color: C.bgDark, fontWeight: '800', fontSize: F.md },
});

export default function App() {
  const [authed, setAuthed] = useState(false);

  if (!authed) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLogin={() => setAuthed(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={NavTheme}>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle:      { backgroundColor: C.bgMid },
            headerTintColor:  C.txtPrimary,
            headerTitleStyle: { fontWeight: '800', fontSize: F.lg },
            cardStyle:        { backgroundColor: C.bgDark },
            headerBackTitleVisible: false,
          }}
        >
          <Stack.Screen
            name="Tables"
            component={TablesScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Order"
            component={OrderScreen}
            options={({ route }) => ({
              title: route.params?.tableName ?? 'Sipariş',
            })}
          />
          <Stack.Screen
            name="Admin"
            component={AdminScreen}
            options={{ title: 'Yönetim Paneli' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}