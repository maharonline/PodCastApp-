// import React, { useEffect } from "react";
// import { Provider } from "react-redux";
// import AppNavigator from "./src/Appnavigation/Appnavigator";
// import { store } from "./src/redux/store";
// import { useAppDispatch } from "./src/redux/hooks";
// import { fetchUser, setLoggedIn, setLoggedOut } from "./src/redux/authSlice";
// import { supabase } from "./src/supabase";

// // Optional: wrapper to fetch user on app start
// export default function App() {
//   useEffect(() => {
//     // 1️⃣ Initial session check
//     const checkSession = async () => {
//       const { data: sessionData } = await supabase.auth.getSession();
//       const user = sessionData.session?.user;
//       if (user) {
//         store.dispatch(setLoggedIn({
//           id: user.id,
//           email: user.email,
//           ...user.user_metadata,
//         }));
//       } else {
//         store.dispatch(setLoggedOut());
//       }
//     };

//     checkSession();

//     // 2️⃣ Auth state listener (handles login/logout in real-time)
//     const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
//       if (session?.user) {
//         // fetch full user metadata immediately after OAuth login
//         const { data: userData } = await supabase.auth.getUser();
//         const user = userData.user;
//         store.dispatch(setLoggedIn({
//           id: user?.id,
//           email: user?.email,
//           ...user?.user_metadata,
//         }));
//       } else {
//         store.dispatch(setLoggedOut());
//       }
//     });

//     // 3️⃣ Cleanup listener on unmount
//     return () => listener.subscription.unsubscribe();
//   }, []);

//   return (
//     <Provider store={store}>
//       <AppNavigator />
//     </Provider>
//   );
// }



import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "./src/redux/store";
import AppNavigator from "./src/Appnavigation/Appnavigator";
import { supabase } from "./src/supabase";
import { setLoggedIn, setLoggedOut } from "./src/redux/authSlice";

export default function App() {
  useEffect(() => {
    const session = supabase.auth.getSession().then(async (res) => {
      const user = res.data.session?.user;
      console.log("App.tsx: Initial Session Check - User:", user?.id);

      if (user) {
        // Fetch profile data from profiles table
        try {
          console.log("App.tsx: Fetching profile for user:", user.id);
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            console.warn("App.tsx: Profile fetch error (expected for new users):", error.message);
          } else {
            console.log("App.tsx: Profile found:", profileData);
          }

          store.dispatch(setLoggedIn({
            id: user.id,
            email: user.email,
            display_name: profileData?.display_name || user.user_metadata?.display_name || user.user_metadata?.name,
            avatar_url: profileData?.avatar_url || user.user_metadata?.avatar_url,
            ...user.user_metadata
          }));
        } catch (error) {
          console.error("App.tsx: Unexpected error fetching profile:", error);
          // Fallback to user metadata if profile fetch fails
          store.dispatch(setLoggedIn({
            id: user.id,
            email: user.email,
            ...user.user_metadata
          }));
        }
      } else {
        console.log("App.tsx: No initial user, dispatching setLoggedOut");
        store.dispatch(setLoggedOut());
      }
    });

    // onAuthStateChange listener
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("App.tsx: Auth State Change Event:", event);

      if (session?.user) {
        console.log("App.tsx: Auth Change - User:", session.user.id);

        // 1. Dispatch IMMEDIATE login with basic data to unblock navigation
        store.dispatch(setLoggedIn({
          id: session.user.id,
          email: session.user.email,
          ...session.user.user_metadata
        }));

        // 2. Fetch profile data in background
        try {
          console.log("App.tsx: Fetching profile in background...");
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.warn("App.tsx: Profile fetch error:", error.message);
          } else if (profileData) {
            console.log("App.tsx: Profile found, updating state");
            // Update state with profile data
            store.dispatch(setLoggedIn({
              id: session.user.id,
              email: session.user.email,
              display_name: profileData.display_name || session.user.user_metadata?.display_name,
              avatar_url: profileData.avatar_url || session.user.user_metadata?.avatar_url,
              ...session.user.user_metadata
            }));
          }
        } catch (error) {
          console.error("App.tsx: Background profile fetch failed:", error);
        }
      } else {
        console.log("App.tsx: Auth Change - No user, logging out");
        store.dispatch(setLoggedOut());
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
}
