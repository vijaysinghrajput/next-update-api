import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-4 py-3 border-b border-gray-100 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-bold">Privacy Policy</Text>
            </View>

            <ScrollView className="flex-1 p-6">
                <Text className="text-gray-500 mb-6">Last updated: {new Date().toLocaleDateString()}</Text>

                <View className="gap-6 mb-10">
                    <View>
                        <Text className="text-lg font-bold mb-2">1. Information We Collect</Text>
                        <Text className="text-gray-700 leading-6">
                            We collect information that you provide directly to us, including:
                        </Text>
                        <View className="ml-4 mt-2 gap-1">
                            <Text className="text-gray-700">• Account information (name, email, phone number)</Text>
                            <Text className="text-gray-700">• Profile information and content you post</Text>
                            <Text className="text-gray-700">• Location data (city selection)</Text>
                            <Text className="text-gray-700">• Usage data and interactions with our platform</Text>
                        </View>
                    </View>

                    <View>
                        <Text className="text-lg font-bold mb-2">2. How We Use Your Information</Text>
                        <Text className="text-gray-700 leading-6">
                            We use the information we collect to:
                        </Text>
                        <View className="ml-4 mt-2 gap-1">
                            <Text className="text-gray-700">• Provide, maintain, and improve our services</Text>
                            <Text className="text-gray-700">• Process transactions and send related information</Text>
                            <Text className="text-gray-700">• Send you technical notices and support messages</Text>
                            <Text className="text-gray-700">• Respond to your comments and questions</Text>
                            <Text className="text-gray-700">• Monitor and analyze trends and usage</Text>
                        </View>
                    </View>

                    <View>
                        <Text className="text-lg font-bold mb-2">3. Information Sharing</Text>
                        <Text className="text-gray-700 leading-6">
                            We do not sell your personal information. We may share your information only:
                        </Text>
                        <View className="ml-4 mt-2 gap-1">
                            <Text className="text-gray-700">• With your consent</Text>
                            <Text className="text-gray-700">• To comply with legal obligations</Text>
                            <Text className="text-gray-700">• To protect our rights and safety</Text>
                            <Text className="text-gray-700">• With service providers who assist us in operating our platform</Text>
                        </View>
                    </View>

                    <View>
                        <Text className="text-lg font-bold mb-2">4. Data Security</Text>
                        <Text className="text-gray-700 leading-6">
                            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                        </Text>
                    </View>

                    <View>
                        <Text className="text-lg font-bold mb-2">5. Your Rights</Text>
                        <Text className="text-gray-700 leading-6">
                            You have the right to:
                        </Text>
                        <View className="ml-4 mt-2 gap-1">
                            <Text className="text-gray-700">• Access and update your personal information</Text>
                            <Text className="text-gray-700">• Delete your account and data</Text>
                            <Text className="text-gray-700">• Opt-out of certain communications</Text>
                            <Text className="text-gray-700">• Request a copy of your data</Text>
                        </View>
                    </View>

                    <View>
                        <Text className="text-lg font-bold mb-2">6. Contact Us</Text>
                        <Text className="text-gray-700 leading-6">
                            If you have questions about this Privacy Policy, please contact us at:
                        </Text>
                        <Text className="text-gray-900 font-semibold mt-2">
                            Email: support@nextupdate.in
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
