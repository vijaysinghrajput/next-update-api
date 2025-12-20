import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TermsScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-4 py-3 border-b border-gray-100 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-bold">Terms of Service</Text>
            </View>

            <ScrollView className="flex-1 p-6">
                <Text className="text-gray-500 mb-6">Last updated: {new Date().toLocaleDateString()}</Text>

                <View className="gap-6 mb-10">
                    <View>
                        <Text className="text-lg font-bold mb-2">1. Acceptance of Terms</Text>
                        <Text className="text-gray-700 leading-6">
                            By accessing and using Next Update, you accept and agree to be bound by the terms and provision of this agreement.
                        </Text>
                    </View>

                    <View>
                        <Text className="text-lg font-bold mb-2">2. Use License</Text>
                        <Text className="text-gray-700 leading-6">
                            Permission is granted to temporarily use Next Update for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                        </Text>
                        <View className="ml-4 mt-2 gap-1">
                            <Text className="text-gray-700">• Modify or copy the materials</Text>
                            <Text className="text-gray-700">• Use the materials for any commercial purpose</Text>
                            <Text className="text-gray-700">• Attempt to decompile or reverse engineer any software</Text>
                            <Text className="text-gray-700">• Remove any copyright or other proprietary notations</Text>
                        </View>
                    </View>

                    <View>
                        <Text className="text-lg font-bold mb-2">3. User Accounts</Text>
                        <Text className="text-gray-700 leading-6">
                            You are responsible for maintaining the confidentiality of your account and password. You agree to:
                        </Text>
                        <View className="ml-4 mt-2 gap-1">
                            <Text className="text-gray-700">• Provide accurate and complete information</Text>
                            <Text className="text-gray-700">• Maintain and update your information</Text>
                            <Text className="text-gray-700">• Keep your password secure</Text>
                            <Text className="text-gray-700">• Notify us immediately of any unauthorized use</Text>
                        </View>
                    </View>

                    <View>
                        <Text className="text-lg font-bold mb-2">4. User Content</Text>
                        <Text className="text-gray-700 leading-6">
                            You retain ownership of content you post. By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and distribute your content on our platform.
                        </Text>
                        <Text className="text-gray-700 leading-6 mt-2">
                            You agree not to post content that:
                        </Text>
                        <View className="ml-4 mt-2 gap-1">
                            <Text className="text-gray-700">• Is illegal, harmful, or violates any laws</Text>
                            <Text className="text-gray-700">• Infringes on intellectual property rights</Text>
                            <Text className="text-gray-700">• Contains hate speech or harassment</Text>
                            <Text className="text-gray-700">• Is spam or misleading</Text>
                        </View>
                    </View>

                    <View>
                        <Text className="text-lg font-bold mb-2">5. Referral Program</Text>
                        <Text className="text-gray-700 leading-6">
                            Our referral program is subject to the following terms:
                        </Text>
                        <View className="ml-4 mt-2 gap-1">
                            <Text className="text-gray-700">• Referrals must be legitimate and not fraudulent</Text>
                            <Text className="text-gray-700">• We reserve the right to verify referrals</Text>
                            <Text className="text-gray-700">• Points and rewards are subject to our discretion</Text>
                            <Text className="text-gray-700">• Abuse of the referral system may result in account termination</Text>
                        </View>
                    </View>

                    <View>
                        <Text className="text-lg font-bold mb-2">6. Prohibited Uses</Text>
                        <Text className="text-gray-700 leading-6">
                            You may not use our service:
                        </Text>
                        <View className="ml-4 mt-2 gap-1">
                            <Text className="text-gray-700">• In any way that violates applicable laws</Text>
                            <Text className="text-gray-700">• To transmit harmful code or malware</Text>
                            <Text className="text-gray-700">• To impersonate others</Text>
                            <Text className="text-gray-700">• To collect user information without consent</Text>
                        </View>
                    </View>

                    <View>
                        <Text className="text-lg font-bold mb-2">7. Termination</Text>
                        <Text className="text-gray-700 leading-6">
                            We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
                        </Text>
                    </View>

                    <View>
                        <Text className="text-lg font-bold mb-2">8. Contact Information</Text>
                        <Text className="text-gray-700 leading-6">
                            If you have any questions about these Terms of Service, please contact us at:
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
