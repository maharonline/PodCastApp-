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
    // Non-blocking auth initialization
    const initAuth = async () => {
      try {
        // 1. Get session immediately and dispatch to unblock UI
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("App.tsx: Session error:", sessionError);
          store.dispatch(setLoggedOut());
          return;
        }

        const user = sessionData.session?.user;
        if (user) {
          // Dispatch immediately - don't wait for profile fetch
          store.dispatch(setLoggedIn({
            id: user.id,
            email: user.email,
            display_name: user.user_metadata?.display_name || user.user_metadata?.name,
            avatar_url: user.user_metadata?.avatar_url,
            ...user.user_metadata
          }));

          // Fetch profile in background (fire and forget)
          (async () => {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

              if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
                console.warn("App.tsx: Profile error:", error.message);
              } else if (profileData) {
                console.log("App.tsx: Profile found, updating");
                store.dispatch(setLoggedIn({
                  id: user.id,
                  email: user.email,
                  display_name: profileData.display_name,
                  avatar_url: profileData.avatar_url,
                  user_metadata: {
                    ...user.user_metadata,
                    // Override user_metadata avatar with database avatar if it exists
                    avatar_url: profileData.avatar_url || user.user_metadata?.avatar_url
                  }
                }));
              }
            } catch (e) {
              console.error("App.tsx: Background profile fetch error:", e);
            }
          })();
        } else {
          console.log("App.tsx: No user in session");
          store.dispatch(setLoggedOut());
        }
      } catch (err) {
        console.error("App.tsx: Init error:", err);
        store.dispatch(setLoggedOut());
      }
    };

    initAuth();

    // Auth state change listener
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("App.tsx: Auth State Change Event:", event);

      if (session?.user) {
        console.log("App.tsx: Auth Change - User:", session.user.id);

        // Dispatch immediately to unblock
        store.dispatch(setLoggedIn({
          id: session.user.id,
          email: session.user.email,
          display_name: session.user.user_metadata?.display_name || session.user.user_metadata?.name,
          avatar_url: session.user.user_metadata?.avatar_url,
          ...session.user.user_metadata
        }));

        // Fetch profile in background (fire and forget)
        (async () => {
          try {
            const { data: profileData, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (error && error.code !== 'PGRST116') {
              console.warn("App.tsx: Profile fetch error:", error.message);
            } else if (profileData) {
              console.log("App.tsx: Profile updated");
              store.dispatch(setLoggedIn({
                id: session.user.id,
                email: session.user.email,
                display_name: profileData.display_name || session.user.user_metadata?.display_name,
                // Prioritize database avatar, only use OAuth avatar if database avatar is empty
                avatar_url: profileData.avatar_url || session.user.user_metadata?.avatar_url,
                user_metadata: {
                  ...session.user.user_metadata,
                  // Override user_metadata avatar with database avatar if it exists
                  avatar_url: profileData.avatar_url || session.user.user_metadata?.avatar_url
                }
              }));
            }
          } catch (error) {
            console.error("App.tsx: Background profile fetch failed:", error);
          }
        })();
      } else {
        console.log("App.tsx: Auth Change - No user");
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
