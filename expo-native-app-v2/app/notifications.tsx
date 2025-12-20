import { View, Text, SafeAreaView, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/auth-store';
import { formatRelativeTime } from '../src/lib/utils';

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useAuthStore();

    const fetchNotifications = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            setNotifications(data);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity className={`flex-row items-center p-4 border-b border-gray-100 ${item.read ? 'bg-white' : 'bg-blue-50'}`}>
            <View className="relative">
                {/* Placeholder for avatar based on type or metadata */}
                <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center">
                    <Ionicons name="person" size={24} color="#9CA3AF" />
                </View>
                <View className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm">
                    <Ionicons
                        name={item.type === 'like' ? 'heart' : item.type === 'comment' ? 'chatbubble' : 'notifications'}
                        size={12}
                        color={item.type === 'like' ? '#EF4444' : item.type === 'comment' ? '#3B82F6' : '#10B981'}
                    />
                </View>
            </View>

            <View className="ml-3 flex-1">
                <Text className="text-gray-900 text-sm">
                    {item.content}
                </Text>
                <Text className="text-gray-400 text-xs mt-1">{formatRelativeTime(item.created_at)}</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator color="#000" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-4 py-3 border-b border-gray-100 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-bold">Notifications</Text>
            </View>

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={() => (
                    <View className="flex-1 items-center justify-center py-20 px-6">
                        <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
                        <Text className="text-lg font-semibold text-gray-900 mt-4">No notifications yet</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}
