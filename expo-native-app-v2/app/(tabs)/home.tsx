import { View, Text, ActivityIndicator, RefreshControl, SafeAreaView, Platform, TouchableOpacity, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useInfinitePosts } from '../../src/hooks/use-infinite-posts';
import PostCard from '../../src/components/posts/PostCard';
import StoryBar from '../../src/components/home/StoryBar';
import { Button } from '../../src/components/ui/Button';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
    const { user } = useAuthStore();
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isLoading,
        isFetchingNextPage,
        refetch
    } = useInfinitePosts(null, null); // Pass cityId/userId if filtering is needed

    const posts = data?.pages.flatMap(page => page.posts) || [];

    const renderItem = ({ item }: { item: any }) => (
        <PostCard post={item} />
    );

    const renderFooter = () => {
        if (!isFetchingNextPage) return null;
        return (
            <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#000" />
            </View>
        );
    };

    const renderEmpty = () => {
        if (isLoading) return null;
        return (
            <View className="flex-1 items-center justify-center py-20 px-6">
                <Ionicons name="images-outline" size={64} color="#D1D5DB" />
                <Text className="text-lg font-semibold text-gray-900 mt-4">No posts yet</Text>
                <Text className="text-gray-500 text-center mt-2">
                    Be the first to create a post in your city!
                </Text>
                <Button
                    label="Create Post"
                    className="mt-6 w-40"
                    onPress={() => Alert.alert('Coming Soon', 'Create Post feature coming soon!')}
                />
            </View>
        );
    };

    if (isLoading && !posts.length) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    // Combined header component to avoid nested list error
    const ListHeader = () => (
        <View>
            <StoryBar />
            {/* You can add other header content here if needed */}
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Simple Header */}
            <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center justify-between shadow-sm z-10">
                <Text className="text-xl font-bold text-primary">Next Update</Text>
                <View className="flex-row gap-4">
                    <Link href="/(tabs)/explore" asChild>
                        <TouchableOpacity>
                            <Ionicons name="search" size={24} color="#374151" />
                        </TouchableOpacity>
                    </Link>
                    <Link href="/notifications" asChild>
                        <TouchableOpacity>
                            <Ionicons name="notifications-outline" size={24} color="#374151" />
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>

            <FlashList
                data={posts}
                renderItem={renderItem}
                estimatedItemSize={400}
                onEndReached={() => {
                    if (hasNextPage) fetchNextPage();
                }}
                onEndReachedThreshold={0.5}
                ListHeaderComponent={ListHeader}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={refetch} />
                }
                contentContainerStyle={{ paddingBottom: 80 }}
            />

            {/* FAB - Create Post */}
            <Link href="/post/create" asChild>
                <TouchableOpacity
                    className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-blue-500/50"
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={32} color="white" />
                </TouchableOpacity>
            </Link>
        </SafeAreaView>
    );
}
