/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: '#CEFF03',
                main: '#F6F6F6',
            }
        },
    },
    plugins: [],
}
