import { Text, TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { cn } from '../../lib/utils';
import { forwardRef } from 'react';

interface ButtonProps extends TouchableOpacityProps {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg';
    isLoading?: boolean;
    label: string;
    className?: string;
    textClassName?: string;
}

const Button = forwardRef<TouchableOpacity, ButtonProps>(
    ({ className, variant = 'primary', size = 'default', isLoading, label, disabled, ...props }, ref) => {
        const baseStyles = "flex-row items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

        const variants = {
            primary: "bg-primary text-white hover:bg-primary/90 active:bg-primary-dark",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            ghost: "hover:bg-accent hover:text-accent-foreground",
        };

        const sizes = {
            default: "h-12 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-14 rounded-md px-8",
        };

        const textStyles = {
            primary: "text-white font-semibold",
            secondary: "text-primary font-semibold",
            outline: "text-foreground font-medium",
            ghost: "text-foreground font-medium",
        };

        return (
            <TouchableOpacity
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                activeOpacity={0.8}
                {...props}
            >
                {isLoading ? (
                    <ActivityIndicator color={variant === 'primary' ? 'white' : '#007AFF'} className="mr-2" />
                ) : null}
                <Text className={cn(textStyles[variant], "text-base")}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    }
);

Button.displayName = 'Button';

export { Button };
