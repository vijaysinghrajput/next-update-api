import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '../../lib/utils';

import { Comment } from '../../types';

interface CommentItemProps {
    comment: Comment;
}

export function CommentItem({ comment }: CommentItemProps) {
    return (
        <View className="flex-row items-start p-4 border-b border-gray-100 bg-white">
            <Image
                source={{ uri: comment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${comment.profiles?.name || 'User'}` }}
                className="w-10 h-10 rounded-full bg-gray-200 mr-3"
            />
            <View className="flex-1">
                <View className="flex-row items-center gap-1 mb-1">
                    <Text className="font-bold text-gray-900">{comment.profiles?.name || 'Unknown User'}</Text>
                    {comment.profiles?.is_verified && (
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    )}
                    <Text className="text-gray-400 text-xs ml-1">• {formatRelativeTime(comment.created_at)}</Text>
                </View>
                <Text className="text-gray-800 leading-5">{comment.content}</Text>
            </View>
        </View>
    );
}
