/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                background: "#ffffff",
                foreground: "#171717",
                primary: {
                    DEFAULT: "#007AFF",
                    dark: "#0051D5",
                    light: "#4DA3FF",
                },
                accent: {
                    blue: "#007AFF",
                    purple: "#AF52DE",
                },
                success: "#34C759",
                error: "#FF3B30",
                warning: "#FF9500",
                info: "#007AFF",
                border: {
                    light: "#E5E5EA",
                    dark: "#30363D",
                }
            },
            fontFamily: {
                inter: ["Inter"],
            },
        },
    },
    plugins: [],
}
