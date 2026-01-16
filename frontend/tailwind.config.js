/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    main: '#1976d2', // Example, adjust to match your AppTheme
                }
            }
        },
    },
    plugins: [],
}
