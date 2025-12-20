import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth-store';

const MOCK_STORIES = [
    { id: '1', user: 'Alice', avatar: 'https://ui-avatars.com/api/?name=Alice', hasStory: true },
    { id: '2', user: 'Bob', avatar: 'https://ui-avatars.com/api/?name=Bob', hasStory: true },
    { id: '3', user: 'Charlie', avatar: 'https://ui-avatars.com/api/?name=Charlie', hasStory: false },
    { id: '4', user: 'David', avatar: 'https://ui-avatars.com/api/?name=David', hasStory: true },
    { id: '5', user: 'Eve', avatar: 'https://ui-avatars.com/api/?name=Eve', hasStory: false },
];

export default function StoryBar() {
    const { user } = useAuthStore();

    return (
        <View className="bg-white py-3 border-b border-gray-100">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {/* Your Story */}
                <TouchableOpacity className="items-center mr-4">
                    <View className="relative">
                        <Image
                            source={{ uri: `https://ui-avatars.com/api/?name=${user?.email || 'Me'}` }}
                            className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white"
                        />
                        <View className="absolute bottom-0 right-0 bg-primary rounded-full p-1 border-2 border-white">
                            <Ionicons name="add" size={12} color="white" />
                        </View>
                    </View>
                    <Text className="text-xs text-gray-500 mt-1 font-medium">Your Story</Text>
                </TouchableOpacity>

                {/* Other Stories */}
                {MOCK_STORIES.map((story) => (
                    <TouchableOpacity key={story.id} className="items-center mr-4">
                        <View className={`rounded-full p-[2px] ${story.hasStory ? 'bg-purple-500' : 'bg-gray-200'}`}>
                            <Image
                                source={{ uri: story.avatar }}
                                className="w-16 h-16 rounded-full border-2 border-white"
                            />
                        </View>
                        <Text className="text-xs text-gray-700 mt-1 font-medium">{story.user}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
