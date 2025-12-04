import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { View } from "react-native";

export const navigationRef = createNavigationContainerRef<any>();

// Redux
import { useAppSelector } from "../redux/hooks";
import { RootState } from "../redux/store";

//===== Stack Screens =======
import Login from "../Screen/Auth/Login";
import Register from "../Screen/Auth/Register";
import RegisterForm from "../Screen/Auth/RegisterForm";
import ForgotPassword from "../Screen/Auth/ForgotPassword";

//===== Tab Screens =======
import Home from "../Screen/Dashboard/Home";
import PlayerScreen from "../Screen/Dashboard/PlayerScreen";
import AllEpisodes from "../Screen/Dashboard/AllEpisodes";
import Search from "../Screen/Dashboard/Search";
import MyLibrary from "../Screen/Dashboard/MyLibrary";
import Profile from "../Screen/Dashboard/Profile";
import NotificationsScreen from "../Screen/Dashboard/NotificationsScreen";

//===== Components =======
import MiniPlayer from "../components/MiniPlayer";

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
  Notifications: undefined;
};

type StackParamList = {
  Root: undefined;
  Login: undefined;
  Register: undefined;
  RegisterForm: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<StackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ----- Tab Icon Helper -----
const getTabIcon = (routeName: string, focused: boolean, color: string, size: number) => {
  let iconName = "";

  switch (routeName) {
    case "Home":
      iconName = focused ? "home" : "home-outline";
      break;
    case "Search":
      iconName = focused ? "search" : "search-outline";
      break;
    case "Library":
      iconName = focused ? "document-text" : "document-text-outline";
      break;
    case "Profile":
      iconName = focused ? "person" : "person-outline";
      break;
    default:
      iconName = "help-circle-outline";
  }

  return <Ionicons name={iconName} color={color} size={size} />;
};

// Only 4 tabs - no hidden screens
const MyTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: "#A637FF",
      tabBarInactiveTintColor: "gray",
      tabBarIcon: ({ focused, color, size }) => getTabIcon(route.name, focused, color, size),
    })}
  >
    <Tab.Screen name="Home" component={Home} />
    <Tab.Screen name="Search" component={Search} />
    <Tab.Screen name="Library" component={MyLibrary} />
    <Tab.Screen name="Profile" component={Profile} />
  </Tab.Navigator>
);

// Main Stack with Tabs + Player + AllEpisodes screens + MiniPlayer
const MainStackNavigator: React.FC = () => {
  const { currentEpisode } = useAppSelector((state: RootState) => state.player);
  const [currentRouteName, setCurrentRouteName] = React.useState<string>('');

  return (
    <View style={{ flex: 1 }}>
      <MainStack.Navigator
        screenOptions={{ headerShown: false }}
        screenListeners={{
          state: (e) => {
            // Get the current route name
            const state = e.data.state;
            if (state) {
              const route = state.routes[state.index];
              setCurrentRouteName(route.name);
            }
          },
        }}
      >
        <MainStack.Screen name="Tabs" component={MyTabs} />
        <MainStack.Screen name="Player" component={PlayerScreen} />
        <MainStack.Screen name="AllEpisodes" component={AllEpisodes} />
        <MainStack.Screen name="Notifications" component={NotificationsScreen} />
      </MainStack.Navigator>

      {/* Show MiniPlayer only when there's a current episode AND not on Player/AllEpisodes/Notifications screens */}
      {currentEpisode && currentRouteName !== 'Player' && currentRouteName !== 'AllEpisodes' && currentRouteName !== 'Notifications' && <MiniPlayer />}
    </View>
  );
};

export default function AppNavigator() {
  const { isAuthenticated } = useAppSelector((state: RootState) => state.auth);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // Authenticated users see Main Stack (Tabs + Player + AllEpisodes)
          <Stack.Screen name="Root" component={MainStackNavigator} />
        ) : (
          // Auth Screens for unauthenticated users
          <>
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="RegisterForm" component={RegisterForm} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
