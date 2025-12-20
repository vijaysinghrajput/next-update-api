import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';

import '../global.css';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [loaded] = useFonts({
        Inter: require('../assets/fonts/Inter-Regular.ttf'),
    });

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
                    <Stack.Screen name="create" options={{ title: 'New Post', presentation: 'fullScreenModal', headerShown: false }} />
                    <Stack.Screen name="post/[id]" options={{ title: 'Post', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="notifications" options={{ title: 'Notifications', presentation: 'modal' }} />
                    <Stack.Screen name="+not-found" />
                </Stack>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
