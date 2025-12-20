import { View, Text, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, router } from 'expo-router';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { supabase } from '../../src/lib/supabase';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Database } from '../../src/types/supabase';

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    phone: z.string().regex(/^[6789]\d{9}$/, 'Please enter a valid 10-digit mobile number').optional().or(z.literal('')),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
    referralCode: z.string().optional(),
    cityId: z.string().min(1, 'Please select your city'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type RegisterSchema = z.infer<typeof registerSchema>;
type City = Database['public']['Tables']['cities']['Row'];

export default function RegisterScreen() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cities, setCities] = useState<City[]>([]);
    const [loadingCities, setLoadingCities] = useState(true);

    // Fetch cities on mount
    useEffect(() => {
        async function fetchCities() {
            try {
                const { data, error } = await supabase
                    .from('cities')
                    .select('*')
                    .eq('is_active', true)
                    .order('name');

                if (error) throw error;
                setCities(data || []);
            } catch (e) {
                console.error('Error fetching cities:', e);
            } finally {
                setLoadingCities(false);
            }
        }
        fetchCities();
    }, []);

    const { control, handleSubmit, formState: { errors } } = useForm<RegisterSchema>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            referralCode: '',
            cityId: '',
        },
    });

    const onSubmit = async (values: RegisterSchema) => {
        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: values.email,
                password: values.password,
                options: {
                    data: {
                        name: values.name,
                        phone: values.phone,
                        city_id: values.cityId,
                        referral_code: values.referralCode,
                    },
                },
            });

            if (error) {
                Alert.alert('Registration Failed', error.message);
                return;
            }

            if (data.user) {
                // Handle referral bonus logic manually if needed, or rely on triggers
                // Ideally this is handled by database triggers as seen in web code

                // Update profile if trigger doesn't capture everything or for safety
                try {
                    await supabase
                        .from('profiles')
                        .update({
                            name: values.name,
                            user_phone: values.phone || null,
                            user_city_id: values.cityId
                        })
                        .eq('id', data.user.id);
                } catch (e) {
                    console.log('Profile update error (non-fatal):', e);
                }

                Alert.alert(
                    'Success',
                    'Registration successful! Please verify your email.',
                    [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
                );
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignUp = () => {
        Alert.alert('Google Sign-Up', 'Native Google Sign-Up to be implemented.');
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <View className="px-6 py-8 w-full max-w-md mx-auto flex-col">
                        <View className="items-center mb-6">
                            <View className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                <Ionicons name="person-add" size={32} color="white" />
                            </View>
                            <Text className="text-3xl font-bold tracking-tight text-foreground text-center">
                                Join Next Update!
                            </Text>
                            <Text className="text-muted-foreground text-center text-gray-500 mt-2 text-base">
                                Create your account and start earning points
                            </Text>
                        </View>

                        <View className="gap-4">
                            <Controller
                                control={control}
                                name="name"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <Input
                                        label="Full Name"
                                        placeholder="John Doe"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        error={errors.name?.message}
                                    />
                                )}
                            />

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

                            <Controller
                                control={control}
                                name="phone"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <Input
                                        label="Mobile Number (Optional)"
                                        placeholder="10-digit number"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value || ''}
                                        error={errors.phone?.message}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                    />
                                )}
                            />

                            {/* City Selection - Simplified as Input for now, strictly should be a Select/Picker */}
                            {/* For native look, a Modal Picker would be better, but we'll use a simple placeholder check or basic list for now. */}
                            {/* Integrating a simple custom picker or just a text input for prototype if the list is long */}

                            <View>
                                <Text className="mb-1.5 font-medium text-foreground">Select City</Text>
                                {/* Quick hack: Vertical list of radio buttons or a modal. For MVP, we might need a Picker component. */}
                                {/* Building a quick modal picker inline or separate component would be best. 
                     For now, let's assume we render a ScrollView of cities in a Modal or just use a simple mock 
                     We should use the standard react-native-picker/picker or build a custom one. 
                     Let's verify what packages we have. We don't have a picker installed.
                     We'll build a custom simple selector.
                  */}
                                <Controller
                                    control={control}
                                    name="cityId"
                                    render={({ field: { onChange, value } }) => (
                                        <View className="gap-2">
                                            {/* Placeholder for a proper dropdown. Using simple horizontal scroll for now or just first few cities */}
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                                                {cities.map(city => (
                                                    <TouchableOpacity
                                                        key={city.id}
                                                        onPress={() => onChange(city.id)}
                                                        className={`px-4 py-2 rounded-full border ${value === city.id ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
                                                    >
                                                        <Text className={value === city.id ? 'text-white' : 'text-gray-700'}>{city.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                            {errors.cityId && <Text className="text-xs text-error text-red-500">{errors.cityId.message}</Text>}
                                        </View>
                                    )}
                                />
                            </View>

                            <View className="gap-1.5">
                                <Controller
                                    control={control}
                                    name="password"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="Password"
                                            placeholder="Min 6 chars"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            error={errors.password?.message}
                                            secureTextEntry
                                        />
                                    )}
                                />
                            </View>

                            <View className="gap-1.5">
                                <Controller
                                    control={control}
                                    name="confirmPassword"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="Confirm Password"
                                            placeholder="Repeat password"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            error={errors.confirmPassword?.message}
                                            secureTextEntry
                                        />
                                    )}
                                />
                            </View>

                            <Controller
                                control={control}
                                name="referralCode"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <Input
                                        label="Referral Code (Optional)"
                                        placeholder="ABCD123"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value || ''}
                                        autoCapitalize="characters"
                                    />
                                )}
                            />

                            <Button
                                label={isSubmitting ? "Creating..." : "Create Account"}
                                onPress={handleSubmit(onSubmit)}
                                isLoading={isSubmitting}
                                className="mt-4 h-14"
                            />

                            <View className="flex-row items-center gap-4 my-2">
                                <View className="h-[1px] bg-gray-200 flex-1" />
                                <Text className="text-gray-400">or</Text>
                                <View className="h-[1px] bg-gray-200 flex-1" />
                            </View>

                            <Button
                                label="Sign up with Google"
                                variant="outline"
                                onPress={handleGoogleSignUp}
                                className="h-14 border-gray-200"
                            />

                            <View className="flex-row justify-center gap-1 mt-4 mb-8">
                                <Text className="text-gray-500">Already have an account?</Text>
                                <Link href="/(auth)/login" asChild>
                                    <TouchableOpacity>
                                        <Text className="text-primary font-semibold">Sign in</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
