import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

// Redux
import { useAppSelector } from "../redux/hooks";
import { RootState } from "../redux/store";

//===== Stack Screens =======
import Login from "../Screen/Auth/Login";
import Register from "../Screen/Auth/Register";
import RegisterForm from "../Screen/Auth/RegisterForm";

//===== Tab Screens =======
import Home from "../Screen/Dashboard/Home";
import PlayerScreen from "../Screen/Dashboard/PlayerScreen";
import AllEpisodes from "../Screen/Dashboard/AllEpisodes";
import Search from "../Screen/Dashboard/Search";
import MyLibrary from "../Screen/Dashboard/MyLibrary";
import Profile from "../Screen/Dashboard/Profile";

// ----- Types -----
type TabParamList = {
  Home: undefined;
  Search: undefined;
  Library: undefined;
  Profile: undefined;
};

type MainStackParamList = {
  Tabs: undefined;
  Player: undefined;
  AllEpisodes: undefined;
};

type StackParamList = {
  Root: undefined;
  Login: undefined;
  Register: undefined;
  RegisterForm: undefined;
};

const Stack = createNativeStackNavigator<StackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ----- Tab Icon Helper -----
const TabIcon = (iconName: string) => ({ color, size }: { color: string; size: number }) => (
  <Ionicons name={iconName} color={color} size={size} />
);

// Only 4 tabs - no hidden screens
const MyTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: "#A637FF",
      tabBarInactiveTintColor: "gray",
    }}
  >
    <Tab.Screen name="Home" component={Home} options={{ tabBarIcon: TabIcon("home") }} />
    <Tab.Screen name="Search" component={Search} options={{ tabBarIcon: TabIcon("search") }} />
    <Tab.Screen name="Library" component={MyLibrary} options={{ tabBarIcon: TabIcon("library") }} />
    <Tab.Screen name="Profile" component={Profile} options={{ tabBarIcon: TabIcon("person") }} />
  </Tab.Navigator>
);

// Main Stack with Tabs + Player + AllEpisodes screens
const MainStackNavigator: React.FC = () => (
  <MainStack.Navigator screenOptions={{ headerShown: false }}>
    <MainStack.Screen name="Tabs" component={MyTabs} />
    <MainStack.Screen name="Player" component={PlayerScreen} />
    <MainStack.Screen name="AllEpisodes" component={AllEpisodes} />
  </MainStack.Navigator>
);

export default function AppNavigator() {
  const { isAuthenticated } = useAppSelector((state: RootState) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // Authenticated users see Main Stack (Tabs + Player + AllEpisodes)
          <Stack.Screen name="Root" component={MainStackNavigator} />
        ) : (
          // Auth Screens for unauthenticated users
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="RegisterForm" component={RegisterForm} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
