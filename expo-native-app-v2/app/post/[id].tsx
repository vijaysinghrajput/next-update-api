import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import PostCard from '../../src/components/posts/PostCard';
import { CommentItem } from '../../src/components/posts/CommentItem';
import { Comment } from '../../src/types';
import { CommentInput } from '../../src/components/posts/CommentInput';
import { useAuthStore } from '../../src/stores/auth-store';

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams();
    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();

    useEffect(() => {
        async function fetchData() {
            if (!id) return;

            // Fetch Post
            const { data: postData } = await supabase
                .from('posts')
                .select(`
          *,
          profiles:user_id (id, name, avatar_url, is_verified, has_blue_tick),
          cities:city_id (name)
        `)
                .eq('id', id)
                .single();

            if (postData) setPost(postData);

            // Fetch Comments
            const { data: commentsData } = await supabase
                .from('comments')
                .select(`
                    *,
                    profiles:user_id (id, name, avatar_url, is_verified)
                `)
                .eq('post_id', id)
                .order('created_at', { ascending: false });

            if (commentsData) setComments(commentsData as any);

            setLoading(false);
        }
        fetchData();
    }, [id]);

    const handleAddComment = async (content: string) => {
        if (!user || !id) return;

        // Optimistic Update
        const newComment = {
            id: Math.random().toString(), // Temp ID
            content,
            created_at: new Date().toISOString(),
            user_id: user.id,
            profiles: {
                id: user.id,
                name: user.name || 'You',
                avatar_url: user.avatar_url,
                is_verified: user.is_verified
            }
        };

        setComments(prev => [newComment as any, ...prev]);

        // API Call
        const { data, error } = await supabase
            .from('comments')
            .insert({
                post_id: id,
                user_id: user.id,
                content
            })
            .select(`
                *,
                profiles:user_id (id, name, avatar_url, is_verified)
            `)
            .single();

        if (!error && data) {
            // Replace optimistic comment with real one
            setComments(prev => [data as any, ...prev.slice(1)]);
        } else {
            // Revert on error
            console.error("Comment failed", error);
            setComments(prev => prev.slice(1));
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator color="#000" />
            </SafeAreaView>
        );
    }

    if (!post) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <Text className="text-gray-500">Post not found</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-primary font-semibold">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-4 py-3 border-b border-gray-100 flex-row items-center bg-white z-10">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="font-bold text-lg">Post</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                className="flex-1"
            >
                <FlatList
                    data={comments}
                    renderItem={({ item }) => <CommentItem comment={item} />}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={() => (
                        <View className="border-b border-gray-100 mb-2">
                            <PostCard post={post} />
                            <View className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                                <Text className="font-bold text-gray-500 text-xs uppercase">Comments</Text>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />

                <CommentInput onSend={handleAddComment} />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
