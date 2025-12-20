import { View, Text, SafeAreaView, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth-store';
import { supabase } from '../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import React from 'react';

export default function ProfileScreen() {
    const { user, signOut } = useAuthStore();

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();
            return data;
        },
        enabled: !!user?.id
    });

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
            <ScrollView className="flex-1">
                <View className="p-6">
                    {/* Header */}
                    <View className="flex-row justify-between items-start mb-6">
                        <Text className="text-3xl font-bold text-gray-900">Profile</Text>
                        <TouchableOpacity onPress={() => router.push('/settings' as any)}>
                            <Ionicons name="settings-outline" size={24} color="black" />
                        </TouchableOpacity>
                    </View>

                    {/* User Info */}
                    <View className="items-center mb-8">
                        <View className="relative mb-4">
                            <Image
                                source={{ uri: profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.name || 'User'}` }}
                                className="w-24 h-24 rounded-full bg-gray-200"
                            />
                            <TouchableOpacity className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-white">
                                <Ionicons name="camera" size={16} color="white" />
                            </TouchableOpacity>
                        </View>
                        <View className="flex-row items-center gap-1">
                            <Text className="text-xl font-bold text-gray-900">{profile?.name || user?.email}</Text>
                            {profile?.is_verified && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                        </View>
                        <Text className="text-gray-500 mt-1">{user?.email}</Text>
                    </View>

                    {/* Stats */}
                    <View className="flex-row justify-around py-6 border-t border-b border-gray-100 mb-8">
                        <View className="items-center">
                            <Text className="text-xl font-bold text-gray-900">0</Text>
                            <Text className="text-gray-500 text-sm">Posts</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-xl font-bold text-gray-900">1.2k</Text>
                            <Text className="text-gray-500 text-sm">Followers</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-xl font-bold text-gray-900">500</Text>
                            <Text className="text-gray-500 text-sm">Following</Text>
                        </View>
                    </View>

                    {/* Menu Items */}
                    <View className="gap-2">
                        <Link href="/profile/edit" asChild>
                            <TouchableOpacity className="flex-row items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <View className="flex-row items-center gap-3">
                                    <Ionicons name="person-outline" size={22} color="#374151" />
                                    <Text className="font-semibold text-gray-700">Edit Profile</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </Link>

                        <TouchableOpacity className="flex-row items-center justify-between p-4 bg-gray-50 rounded-2xl">
                            <View className="flex-row items-center gap-3">
                                <Ionicons name="shield-checkmark-outline" size={22} color="#374151" />
                                <Text className="font-semibold text-gray-700">Get Verified</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center justify-between p-4 bg-gray-50 rounded-2xl">
                            <View className="flex-row items-center gap-3">
                                <Ionicons name="help-circle-outline" size={22} color="#374151" />
                                <Text className="font-semibold text-gray-700">Help & Support</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>

                        <Button
                            label="Log Out"
                            variant="outline"
                            onPress={handleSignOut}
                            className="mt-4 border-red-200"
                            textClassName="text-red-500"
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
