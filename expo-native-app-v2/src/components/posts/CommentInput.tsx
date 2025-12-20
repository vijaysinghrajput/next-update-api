import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth-store';

interface CommentInputProps {
    onSend: (content: string) => Promise<void>;
}

export function CommentInput({ onSend }: CommentInputProps) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuthStore();

    const handleSend = async () => {
        if (!content.trim() || loading) return;

        setLoading(true);
        try {
            await onSend(content.trim());
            setContent('');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null; // Or show prompt to login

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            className="border-t border-gray-100 bg-white p-3"
        >
            <View className="flex-row items-center gap-3">
                {/* <Image 
                    source={{ uri: user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}` }} 
                    className="w-8 h-8 rounded-full bg-gray-200"
                /> */}
                <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-2">
                    <TextInput
                        placeholder="Add a comment..."
                        value={content}
                        onChangeText={setContent}
                        className="flex-1 mr-2 text-base text-gray-900 max-h-24"
                        multiline
                    />
                    {loading ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!content.trim()}
                            className={content.trim() ? "opacity-100" : "opacity-30"}
                        >
                            <Text className="font-bold text-primary">Post</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
