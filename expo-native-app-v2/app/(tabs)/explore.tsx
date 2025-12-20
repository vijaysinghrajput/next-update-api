import { View, Text, SafeAreaView, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { Link, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { debounce } from '../../src/lib/utils'; // Create debounce if not exists or use lodash
import React from 'react';

// Simple debounce implementation if not imported
function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export default function ExploreScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 500);

    const { data: results, isLoading } = useQuery({
        queryKey: ['search', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery.trim()) return { users: [] };

            const { data: users } = await supabase
                .from('profiles')
                .select('id, name, avatar_url, is_verified')
                .ilike('name', `%${debouncedQuery}%`)
                .limit(10);

            return { users: users || [] };
        },
        enabled: debouncedQuery.length > 0
    });

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            className="flex-row items-center p-4 bg-white border-b border-gray-100"
            onPress={() => Alert.alert("Profile", "User profile view coming soon")}
        >
            <Image
                source={{ uri: item.avatar_url || `https://ui-avatars.com/api/?name=${item.name}` }}
                className="w-12 h-12 rounded-full bg-gray-200"
            />
            <View className="ml-3">
                <View className="flex-row items-center">
                    <Text className="font-semibold text-gray-900 text-base">{item.name}</Text>
                    {item.is_verified && (
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginLeft: 4 }} />
                    )}
                </View>
                <Text className="text-gray-500 text-sm">View Profile</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="p-4 border-b border-gray-100">
                <Text className="text-3xl font-bold mb-4 text-primary">Explore</Text>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 h-12">
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-3 text-base text-gray-900"
                        placeholder="Search people..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#000" />
                </View>
            ) : (
                <FlatList
                    data={results?.users}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={() => (
                        <View className="flex-1 items-center justify-center py-20">
                            <Text className="text-gray-400 text-center">
                                {debouncedQuery.length > 0 ? "No users found" : "Search for users"}
                            </Text>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}
