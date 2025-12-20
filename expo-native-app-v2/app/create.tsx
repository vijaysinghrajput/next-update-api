import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Image, Alert, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/auth-store';
import { supabase } from '../src/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../src/components/ui/Button';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function CreatePostScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedCity, setSelectedCity] = useState<{ id: string, name: string } | null>(null);
    const [media, setMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [showCityModal, setShowCityModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch cities
    const { data: cities } = useQuery({
        queryKey: ['cities'],
        queryFn: async () => {
            const { data } = await supabase
                .from('cities')
                .select('id, name')
                .eq('is_active', true)
                .order('name');
            return data || [];
        }
    });

    const pickMedia = async () => {
        // Check permissions ? Expo handles this well usually
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            selectionLimit: 5,
            quality: 0.7,
            base64: true, // Need base64 for Supabase upload in RN usually or ArrayBuffer
        });

        if (!result.canceled) {
            setMedia([...media, ...result.assets].slice(0, 5));
        }
    };

    const removeMedia = (index: number) => {
        const newMedia = [...media];
        newMedia.splice(index, 1);
        setMedia(newMedia);
    };

    const uploadFile = async (asset: ImagePicker.ImagePickerAsset) => {
        try {
            const fileExt = asset.uri.split('.').pop();
            const fileName = `${user?.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            // Ensure we have base64
            if (!asset.base64) {
                throw new Error("Could not process image (no base64)");
            }

            const { error: uploadError } = await supabase.storage
                .from('posts') // Assuming 'posts' bucket exists, similar to 'avatars'
                .upload(filePath, decode(asset.base64), {
                    contentType: asset.mimeType || 'image/jpeg',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('posts').getPublicUrl(filePath);
            return data.publicUrl;

        } catch (e: any) {
            console.error("Upload error:", e);
            throw e;
        }
    };

    // Helper to decode base64
    function decode(base64: string) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    const handleSubmit = async () => {
        if (!content.trim() && media.length === 0) {
            Alert.alert("Error", "Please add some content or media");
            return;
        }
        if (!selectedCity) {
            Alert.alert("Error", "Please select a city");
            return;
        }

        try {
            setLoading(true);

            // Upload media first
            const mediaUrls: string[] = [];
            let mediaType = 'image';

            if (media.length > 0) {
                // Determine type from first file
                if (media[0].type === 'video') mediaType = 'video';

                for (const asset of media) {
                    const url = await uploadFile(asset);
                    if (url) mediaUrls.push(url);
                }
            }

            // Create Post
            const { error } = await supabase
                .from('posts')
                .insert({
                    user_id: user?.id,
                    city_id: selectedCity.id,
                    title: title.trim() || null, // Optional
                    caption: content.trim() || null,
                    media_urls: mediaUrls,
                    media_type: mediaType,
                    is_active: true
                });

            if (error) throw error;

            Alert.alert("Success", "Post created successfully!", [
                {
                    text: "OK", onPress: () => {
                        queryClient.invalidateQueries({ queryKey: ['posts'] });
                        router.replace('/(tabs)/home');
                    }
                }
            ]);

        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to create post");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-4 py-3 border-b border-gray-100 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-gray-500 text-lg">Cancel</Text>
                </TouchableOpacity>
                <Text className="text-lg font-bold">New Post</Text>
                <Button
                    label={loading ? "Posting..." : "Post"}
                    onPress={handleSubmit}
                    size="sm"
                    disabled={loading}
                    isLoading={loading}
                    className="w-20"
                />
            </View>

            <ScrollView className="flex-1 p-4">
                {/* City Selector */}
                <TouchableOpacity
                    onPress={() => setShowCityModal(true)}
                    className="flex-row items-center space-x-2 bg-gray-50 p-3 rounded-xl mb-4"
                >
                    <Ionicons name="location" size={20} color="#6B7280" />
                    <Text className={selectedCity ? "text-black font-medium" : "text-gray-400"}>
                        {selectedCity ? selectedCity.name : "Select City"}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                {/* Title (Optional) */}
                <TextInput
                    placeholder="Title (Optional)"
                    className="text-xl font-bold mb-2 p-2"
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                />

                {/* Content */}
                <TextInput
                    placeholder="What's happening?"
                    className="text-base text-gray-800 p-2 min-h-[100px]"
                    multiline
                    textAlignVertical="top"
                    value={content}
                    onChangeText={setContent}
                />

                {/* Media Preview */}
                <View className="flex-row flex-wrap gap-2 mt-4">
                    {media.map((asset, index) => (
                        <View key={index} className="relative w-[30%] aspect-square rounded-lg overflow-hidden bg-gray-100">
                            <Image source={{ uri: asset.uri }} className="w-full h-full" resizeMode="cover" />
                            <TouchableOpacity
                                onPress={() => removeMedia(index)}
                                className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                            >
                                <Ionicons name="close" size={12} color="white" />
                            </TouchableOpacity>
                            {asset.type === 'video' && (
                                <View className="absolute inset-0 items-center justify-center">
                                    <Ionicons name="play-circle" size={32} color="white" />
                                </View>
                            )}
                        </View>
                    ))}

                    {media.length < 5 && (
                        <TouchableOpacity
                            onPress={pickMedia}
                            className="w-[30%] aspect-square rounded-lg border-2 border-dashed border-gray-300 items-center justify-center bg-gray-50"
                        >
                            <Ionicons name="images-outline" size={24} color="#9CA3AF" />
                            <Text className="text-xs text-gray-400 mt-1">Add Media</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* City Modal */}
            <Modal visible={showCityModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView className="flex-1 bg-white">
                    <View className="px-4 py-3 border-b border-gray-100 flex-row items-center justify-between">
                        <Text className="text-lg font-bold">Select City</Text>
                        <TouchableOpacity onPress={() => setShowCityModal(false)}>
                            <Ionicons name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                    {cities ? (
                        <FlatList
                            data={cities}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className="p-4 border-b border-gray-50"
                                    onPress={() => {
                                        setSelectedCity(item);
                                        setShowCityModal(false);
                                    }}
                                >
                                    <Text className="text-base">{item.name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    ) : (
                        <ActivityIndicator className="mt-10" />
                    )}
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
}
