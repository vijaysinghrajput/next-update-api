import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/stores/auth-store';

export default function SettingsScreen() {
    const router = useRouter();
    const { signOut } = useAuthStore();

    const handleSignOut = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        await signOut();
                        router.replace('/(auth)/login');
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-4 py-3 border-b border-gray-100 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-bold">Settings</Text>
            </View>

            <ScrollView className="flex-1 bg-gray-50">
                <View className="mt-6 bg-white border-t border-b border-gray-100 px-4">

                    <Link href="/privacy" asChild>
                        <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-gray-100">
                            <Text className="text-base text-gray-800">Privacy Policy</Text>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </Link>

                    <Link href="/terms" asChild>
                        <TouchableOpacity className="flex-row items-center justify-between py-4">
                            <Text className="text-base text-gray-800">Terms of Service</Text>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </Link>
                </View>

                <View className="mt-6 bg-white border-t border-b border-gray-100 px-4">
                    <TouchableOpacity
                        onPress={handleSignOut}
                        className="flex-row items-center justify-between py-4"
                    >
                        <Text className="text-base text-red-500 font-medium">Log Out</Text>
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                <View className="p-6 items-center">
                    <Text className="text-gray-400 text-sm">Version 1.0.0</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
