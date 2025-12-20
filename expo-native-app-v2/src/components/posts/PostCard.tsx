import React from 'react';
import { View, Text, Image, TouchableOpacity, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime, formatNumber, resizeImageUrl } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';
import { Link } from 'expo-router';

// Simple types for now, expand based on Supabase schema
interface Post {
    id: string;
    title: string | null;
    caption: string | null;
    media_urls: string[];
    media_type: 'image' | 'video';
    likes_count: number;
    comments_count: number;
    shares_count: number;
    created_at: string;
    profiles: {
        id: string;
        name: string;
        avatar_url: string | null;
        is_verified: boolean;
        has_blue_tick: boolean;
    };
    cities?: {
        name: string;
    };
    isLiked?: boolean;
    isSaved?: boolean;
}

interface PostCardProps {
    post: Post;
    onUpdate?: () => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
    const { user } = useAuthStore();
    const [isLiked, setIsLiked] = React.useState(post.isLiked);
    const [likesCount, setLikesCount] = React.useState(post.likes_count);

    const handleLike = async () => {
        if (!user) {
            Alert.alert('Login Required', 'Please login to like posts');
            return;
        }

        // Optimistic update
        const previousState = isLiked;
        const previousCount = likesCount;

        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

        try {
            if (!previousState) {
                // Like
                await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
            } else {
                // Unlike
                await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
            }
        } catch (error) {
            // Revert on error
            setIsLiked(previousState);
            setLikesCount(previousCount);
            console.error('Like error:', error);
        }
    };

    const handleShare = async () => {
        try {
            // Construct a deep link or web link
            const message = `${post.title || 'Check out this post'} - Next Update\nhttps://nextupdate.in/post/${post.id}`;
            await Share.share({
                message,
                title: post.title || 'Next Update Post',
            });

            // Track share
            if (user) {
                await supabase.from('post_shares').insert({ post_id: post.id, user_id: user.id });
            }
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const renderMedia = () => {
        if (!post.media_urls || post.media_urls.length === 0) return null;

        // Just show first image for now
        // In a real app we'd want a carousel for multiple images
        const mediaUrl = post.media_urls[0];

        return (
            <View className="w-full aspect-video bg-gray-100 rounded-xl overflow-hidden mb-3">
                <Image
                    source={{ uri: mediaUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                />
            </View>
        );
    };

    return (
        <View className="bg-white p-4 mb-2 border-b border-gray-100">
            {/* Header */}
            <View className="flex-row items-center mb-3">
                <Image
                    source={{ uri: post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.name || 'User'}` }}
                    className="w-10 h-10 rounded-full bg-gray-200"
                />
                <View className="ml-3 flex-1">
                    <View className="flex-row items-center">
                        <Text className="font-bold text-gray-900">{post.profiles?.name}</Text>
                        {post.profiles?.is_verified && (
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginLeft: 4 }} />
                        )}
                        {post.profiles?.has_blue_tick && (
                            <Ionicons name="checkmark-circle" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
                        )}
                    </View>
                    <View className="flex-row items-center">
                        <Text className="text-xs text-gray-500">{formatRelativeTime(post.created_at)}</Text>
                        {post.cities?.name && (
                            <>
                                <Text className="text-xs text-gray-400 mx-1">•</Text>
                                <Text className="text-xs text-gray-500">{post.cities.name}</Text>
                            </>
                        )}
                    </View>
                </View>
            </View>

            {/* Content */}
            <View className="mb-3">
                {post.title && <Text className="text-base font-semibold mb-1 text-gray-900">{post.title}</Text>}
                {post.caption && <Text className="text-sm text-gray-700 leading-5">{post.caption}</Text>}
            </View>

            {/* Media */}
            {renderMedia()}

            {/* Actions */}
            <View className="flex-row items-center justify-between pt-2 border-t border-gray-50">
                <View className="flex-row gap-6">
                    <TouchableOpacity onPress={handleLike} className="flex-row items-center gap-1.5">
                        <Ionicons
                            name={isLiked ? "heart" : "heart-outline"}
                            size={22}
                            color={isLiked ? "#EF4444" : "#6B7280"}
                        />
                        <Text className={`text-sm ${isLiked ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                            {formatNumber(likesCount)}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center gap-1.5">
                        <Ionicons name="chatbubble-outline" size={22} color="#6B7280" />
                        <Text className="text-sm text-gray-500">{formatNumber(post.comments_count)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleShare} className="flex-row items-center gap-1.5">
                        <Ionicons name="share-social-outline" size={22} color="#6B7280" />
                        <Text className="text-sm text-gray-500">{formatNumber(post.shares_count)}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
