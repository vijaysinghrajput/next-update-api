import { View, Text, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, router } from 'expo-router';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { supabase } from '../../src/lib/supabase';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordSchema>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = async (data: ForgotPasswordSchema) => {
        setIsSubmitting(true);
        try {
            const email = data.email.toLowerCase().trim();
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                // Deep link to a specific update-password route in the app if configured
                redirectTo: 'https://app.nextupdate.in/auth/reset-password',
            });

            if (error) {
                Alert.alert('Error', error.message);
                return;
            }

            setIsSuccess(true);
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
                <View className="items-center w-full max-w-md bg-green-50 p-6 rounded-2xl border border-green-100">
                    <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                    <Text className="text-xl font-bold text-gray-900 mt-4 text-center">Check your email</Text>
                    <Text className="text-gray-600 text-center mt-2 mb-6">
                        We've sent a password reset link to your email address.
                    </Text>
                    <Link href="/(auth)/login" asChild>
                        <Button label="Back to Login" className="w-full" />
                    </Link>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                {/* Custom Back Button */}
                <View className="px-6 pt-4">
                    <Link href="/(auth)/login" asChild>
                        <TouchableOpacity className="flex-row items-center">
                            <Ionicons name="arrow-back" size={24} color="black" />
                            <Text className="ml-2 font-medium">Back</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                    <View className="px-6 py-8 w-full max-w-md mx-auto flex-col">
                        <View className="items-center mb-8">
                            <View className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                <Ionicons name="mail" size={32} color="white" />
                            </View>
                            <Text className="text-3xl font-bold tracking-tight text-foreground text-center">
                                Forgot Password?
                            </Text>
                            <Text className="text-muted-foreground text-center text-gray-500 mt-2 text-base">
                                Enter your email address and we'll send you a link to reset your password.
                            </Text>
                        </View>

                        <View className="gap-6">
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <Input
                                        label="Email"
                                        placeholder="email@example.com"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        error={errors.email?.message}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                )}
                            />

                            <Button
                                label={isSubmitting ? "Sending..." : "Send Reset Link"}
                                onPress={handleSubmit(onSubmit)}
                                isLoading={isSubmitting}
                                className="mt-2 h-14"
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
