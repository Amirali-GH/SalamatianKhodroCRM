import { createTheme } from '@mui/material/styles'

// رنگ سازمانی #8e44ad — بنفش
const theme = createTheme({
    direction: 'rtl',
    palette: {
        primary: {
            main: '#8e44ad'
        },
        secondary: {
            main: '#6c757d'
        }
    },
    typography: {
        fontFamily: 'Vazir, Arial, sans-serif'
    }
})

export default theme
