import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { supabase } from '../../src/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Button } from '../../src/components/ui/Button';
import { AppConfig } from '../../src/lib/utils';
import React from 'react';

const editProfileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    age: z.coerce.number().min(13, "You must be at least 13 years old").max(120).optional(),
    gender: z.string().optional(),
    city_id: z.string().optional(), // We'll handle city selection separately/simpler for now
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [uploading, setUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const { control, handleSubmit, setValue, formState: { errors } } = useForm<EditProfileForm>({
        resolver: zodResolver(editProfileSchema),
    });

    const { data: profile, isLoading: isProfileLoading } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();
            return data;
        },
        enabled: !!user?.id,
    });

    // Pre-fill form
    React.useEffect(() => {
        if (profile) {
            setValue('name', profile.name);
            setValue('age', profile.age);
            setValue('gender', profile.gender);
            setValue('city_id', profile.city_id);
            setAvatarUrl(profile.avatar_url);
        }
    }, [profile, setValue]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            uploadAvatar(result.assets[0]);
        }
    };

    const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
        try {
            setUploading(true);
            if (!asset.base64) throw new Error('No image data');

            const fileExt = asset.uri.split('.').pop();
            const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(asset.base64), {
                    contentType: asset.mimeType || 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setAvatarUrl(data.publicUrl);
        } catch (error: any) {
            Alert.alert('Upload failed', error.message);
        } finally {
            setUploading(false);
        }
    };

    // Helper to decode base64 for Supabase upload
    function decode(base64: string) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    const updateProfile = useMutation({
        mutationFn: async (data: EditProfileForm) => {
            const { error } = await supabase
                .from('profiles')
                .update({
                    ...data,
                    avatar_url: avatarUrl,
                })
                .eq('id', user?.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
            Alert.alert('Success', 'Profile updated successfully');
            router.back();
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message);
        }
    });

    const onSubmit = (data: EditProfileForm) => {
        updateProfile.mutate(data);
    };

    if (isProfileLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-4 py-3 border-b border-gray-100 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-bold">Edit Profile</Text>
            </View>

            <ScrollView className="flex-1 p-6">
                {/* Avatar */}
                <View className="items-center mb-8">
                    <TouchableOpacity onPress={pickImage} className="relative">
                        <Image
                            source={{ uri: avatarUrl || `https://ui-avatars.com/api/?name=${user?.email}` }}
                            className="w-28 h-28 rounded-full bg-gray-200"
                        />
                        <View className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-white">
                            <Ionicons name={uploading ? "hourglass" : "camera"} size={18} color="white" />
                        </View>
                    </TouchableOpacity>
                    <Text className="text-gray-500 mt-2 text-sm">Tap to change photo</Text>
                </View>

                {/* Form */}
                <View className="gap-4">
                    <View>
                        <Text className="text-gray-700 font-medium mb-1">Display Name</Text>
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base"
                                    value={value}
                                    onChangeText={onChange}
                                    placeholder="Your Name"
                                />
                            )}
                        />
                        {errors.name && <Text className="text-red-500 text-sm mt-1">{errors.name.message}</Text>}
                    </View>

                    <View>
                        <Text className="text-gray-700 font-medium mb-1">Age</Text>
                        <Controller
                            control={control}
                            name="age"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base"
                                    value={value?.toString()}
                                    onChangeText={onChange}
                                    keyboardType="numeric"
                                    placeholder="Age"
                                />
                            )}
                        />
                        {errors.age && <Text className="text-red-500 text-sm mt-1">{errors.age.message}</Text>}
                    </View>

                    <View>
                        <Text className="text-gray-700 font-medium mb-1">Gender</Text>
                        {/* Simple Select for now */}
                        <Controller
                            control={control}
                            name="gender"
                            render={({ field: { onChange, value } }) => (
                                <View className="flex-row gap-4">
                                    {['male', 'female', 'other'].map((option) => (
                                        <TouchableOpacity
                                            key={option}
                                            onPress={() => onChange(option)}
                                            className={`flex-1 py-3 px-4 rounded-xl border ${value === option ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'}`}
                                        >
                                            <Text className={`text-center capitalize ${value === option ? 'text-white font-bold' : 'text-gray-700'}`}>
                                                {option}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        />
                    </View>

                    <Button
                        label={updateProfile.isPending ? "Saving..." : "Save Changes"}
                        onPress={handleSubmit(onSubmit)}
                        isLoading={updateProfile.isPending}
                        className="mt-6"
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
