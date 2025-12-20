import { TextInput, View, Text, TextInputProps } from 'react-native';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerClassName?: string;
}

const Input = forwardRef<TextInput, InputProps>(
    ({ className, containerClassName, label, error, ...props }, ref) => {
        return (
            <View className={cn("w-full gap-1.5", containerClassName)}>
                {label && (
                    <Text className="text-sm font-medium text-foreground dark:text-gray-200">
                        {label}
                    </Text>
                )}
                <TextInput
                    ref={ref}
                    className={cn(
                        "flex h-12 w-full rounded-xl border border-border-light bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-dark dark:bg-bg-secondary-dark dark:text-white",
                        error && "border-error",
                        className
                    )}
                    placeholderTextColor="#9ca3af"
                    {...props}
                />
                {error && <Text className="text-xs text-error">{error}</Text>}
            </View>
        );
    }
);

Input.displayName = 'Input';

export { Input };
