/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
        colors: {
            primary: "#00355f",
            "primary-container": "#0f4c81",
            surface: "#f7f9fb",
            "surface-container": "#eceef0",
            "surface-container-lowest": "#ffffff",
            outline: "#727780",
        },
        },
    },
    plugins: [],
}