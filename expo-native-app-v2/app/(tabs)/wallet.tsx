import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Alert, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth-store';
import { supabase } from '../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { formatNumber } from '../../src/lib/utils';
import React from 'react';

export default function WalletScreen() {
    const { user } = useAuthStore();

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();
            return data;
        },
        enabled: !!user?.id
    });

    const copyReferralCode = () => {
        if (profile?.referral_code) {
            Clipboard.setString(profile.referral_code);
            Alert.alert("Copied", "Referral code copied to clipboard!");
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="flex-1">
                <View className="p-6">
                    <Text className="text-3xl font-bold mb-6 text-primary">Wallet</Text>

                    {/* Balance Card */}
                    <View className="bg-primary p-6 rounded-3xl mb-6 shadow-lg shadow-blue-200">
                        <Text className="text-white/80 font-medium mb-1">Total Points</Text>
                        <Text className="text-white text-4xl font-bold mb-4">
                            {formatNumber(profile?.points || 0)}
                        </Text>
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                className="bg-white/20 px-4 py-2 rounded-xl"
                                onPress={() => Alert.alert("Coming Soon", "Redeem feature coming soon")}
                            >
                                <Text className="text-white font-semibold">Redeem</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="bg-white/20 px-4 py-2 rounded-xl"
                            >
                                <Text className="text-white font-semibold">History</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Referral Section */}
                    <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
                        <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-row items-center gap-3">
                                <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center">
                                    <Ionicons name="gift" size={20} color="#9333EA" />
                                </View>
                                <View>
                                    <Text className="font-bold text-gray-900 text-lg">Refer & Earn</Text>
                                    <Text className="text-gray-500 text-xs">Get 100 points per referral</Text>
                                </View>
                            </View>
                        </View>

                        <View className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-4 flex-row items-center justify-between mb-4">
                            <Text className="font-mono text-lg font-bold text-gray-700 tracking-widest">
                                {profile?.referral_code || 'LOADING...'}
                            </Text>
                            <TouchableOpacity onPress={copyReferralCode}>
                                <Text className="text-primary font-bold">COPY</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            className="bg-gray-900 rounded-xl py-3 items-center"
                            onPress={() => Alert.alert("Share", "Share functionality to be implemented")}
                        >
                            <Text className="text-white font-bold">Invite Friends</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Transaction History */}
                    <View>
                        <Text className="text-xl font-bold mb-4 text-gray-900">Recent Activity</Text>
                        <TransactionList userId={user?.id} />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function TransactionList({ userId }: { userId?: string }) {
    const { data: transactions, isLoading } = useQuery({
        queryKey: ['transactions', userId],
        queryFn: async () => {
            if (!userId) return [];
            const { data } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);
            return data || [];
        },
        enabled: !!userId
    });

    if (isLoading) {
        return <View className="py-4"><Text className="text-center text-gray-400">Loading activity...</Text></View>;
    }

    if (!transactions || transactions.length === 0) {
        return <View className="py-8 bg-white rounded-2xl items-center border border-gray-100"><Text className="text-gray-400">No recent activity</Text></View>;
    }

    return (
        <View className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100">
            {transactions.map((tx) => (
                <View key={tx.id} className="flex-row items-center justify-between p-4 border-b border-gray-50 last:border-0">
                    <View className="flex-row items-center gap-3">
                        <View className={`w-10 h-10 rounded-full items-center justify-center ${tx.type === 'EARN' ? 'bg-green-100' : 'bg-red-100'}`}>
                            <Ionicons
                                name={tx.type === 'EARN' ? "arrow-down" : "arrow-up"}
                                size={20}
                                color={tx.type === 'EARN' ? "#10B981" : "#EF4444"}
                            />
                        </View>
                        <View>
                            <Text className="font-bold text-gray-900">{tx.description || 'Transaction'}</Text>
                            <Text className="text-gray-400 text-xs">{new Date(tx.created_at).toLocaleDateString()}</Text>
                        </View>
                    </View>
                    <Text className={`font-bold ${tx.type === 'EARN' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'EARN' ? '+' : '-'}{tx.amount}
                    </Text>
                </View>
            ))}
        </View>
    );
}
