import { View, Text, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, router } from 'expo-router';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/stores/auth-store';
import { supabase } from '../../src/lib/supabase';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginSchema = z.infer<typeof loginSchema>;

// Configure Google Sign-In
GoogleSignin.configure({
    webClientId: '93560850995-un30q4gmehqa2aq0jm2sdbsrmf24cvj2.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
});

export default function LoginScreen() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { initialize } = useAuthStore();

    const { control, handleSubmit, formState: { errors } } = useForm<LoginSchema>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginSchema) => {
        setIsSubmitting(true);
        try {
            const email = data.email.toLowerCase().trim();
            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email,
                password: data.password,
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    Alert.alert('Login Failed', 'No account found with this email. Please sign up first.');
                } else if (error.message.includes('Email not confirmed')) {
                    Alert.alert('Login Failed', 'Please verify your email first.');
                } else {
                    Alert.alert('Login Failed', error.message);
                }
                return;
            }

            if (authData.user) {
                // Check profile existence like in web
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', authData.user.id)
                    .single();

                if (!profile) {
                    try {
                        // Create profile if missing
                        // Create profile if missing
                        await supabase.rpc('create_user_profile', {
                            user_id: authData.user.id,
                            user_email: authData.user.email!,
                            user_name: authData.user.user_metadata?.name || authData.user.email!.split('@')[0],
                            user_phone: "",
                            user_city_id: "",
                            referral_code_used: ""
                        });
                    } catch (e) {
                        console.log('Profile creation error (minor):', e);
                    }
                }

                await initialize();
                router.replace('/(tabs)/home');
            }

        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();

            if (userInfo.data?.idToken) {
                setIsSubmitting(true);
                const { data: authData, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: userInfo.data.idToken,
                });

                if (error) throw error;

                if (authData.user) {
                    // Check profile existence like in web
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', authData.user.id)
                        .single();

                    if (!profile) {
                        try {
                            // Create profile if missing
                            await supabase.rpc('create_user_profile', {
                                user_id: authData.user.id,
                                user_email: authData.user.email!,
                                user_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || authData.user.email!.split('@')[0],
                                user_phone: null,
                                user_city_id: null,
                                referral_code_used: null
                            });
                        } catch (e) {
                            console.log('Profile creation error (minor):', e);
                        }
                    }

                    await initialize();
                    router.replace('/(tabs)/home');
                }
            } else {
                // throw new Error('No ID token present!');
                // Silent catch or specific handling?
            }
        } catch (error: any) {
            if (isErrorWithCode(error)) {
                switch (error.code) {
                    case statusCodes.SIGN_IN_CANCELLED:
                        // user cancelled the login flow
                        break;
                    case statusCodes.IN_PROGRESS:
                        // operation (e.g. sign in) is in progress already
                        break;
                    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        // play services not available or outdated
                        Alert.alert('Error', 'Google Play Services not available');
                        break;
                    default:
                        Alert.alert('Error', error.message);
                }
            } else {
                Alert.alert('Error', error.message || 'An unexpected error occurred');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                    <View className="px-6 py-8 w-full max-w-md mx-auto flex-col">
                        {/* Header matching Web UI */}
                        <View className="items-center mb-8">
                            <View className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                <Ionicons name="person" size={32} color="white" />
                            </View>
                            <Text className="text-3xl font-bold tracking-tight text-foreground text-center">
                                Welcome Back!
                            </Text>
                            <Text className="text-muted-foreground text-center text-gray-500 mt-2 text-base">
                                Sign in to continue your journey
                            </Text>
                        </View>

                        <View className="gap-6">
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <Input
                                        label="Email"
                                        placeholder="Email address"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        error={errors.email?.message}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                )}
                            />

                            <View className="gap-1.5">
                                <Controller
                                    control={control}
                                    name="password"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="Password"
                                            placeholder="Password"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            error={errors.password?.message}
                                            secureTextEntry
                                        />
                                    )}
                                />
                            </View>

                            <Button
                                label={isSubmitting ? "Signing in..." : "Sign In"}
                                onPress={handleSubmit(onSubmit)}
                                isLoading={isSubmitting}
                                className="mt-2 text-lg h-14"
                            />

                            <View className="flex-row items-center gap-4 my-2">
                                <View className="h-[1px] bg-gray-200 flex-1" />
                                <Text className="text-gray-400">or continue with</Text>
                                <View className="h-[1px] bg-gray-200 flex-1" />
                            </View>

                            <Button
                                label="Continue with Google"
                                variant="outline"
                                onPress={handleGoogleLogin}
                                className="h-14 border-gray-200"
                            />

                            <View className="items-center mt-4 gap-4">
                                <Link href="/(auth)/forgot-password" asChild>
                                    <TouchableOpacity>
                                        <Text className="text-sm text-gray-500">
                                            Forgot your password?
                                        </Text>
                                    </TouchableOpacity>
                                </Link>

                                <View className="flex-row gap-1">
                                    <Text className="text-gray-500">Don't have an account?</Text>
                                    <Link href="/(auth)/register" asChild>
                                        <TouchableOpacity>
                                            <Text className="text-primary font-semibold">Sign up now</Text>
                                        </TouchableOpacity>
                                    </Link>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
