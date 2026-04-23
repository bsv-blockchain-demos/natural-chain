"use client"
import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary: {
      main: '#0D2137',      // deep navy — authority, trust
      light: '#1A3A5C',
      dark: '#06111D',
    },
    secondary: {
      main: '#D4A843',      // warm gold — energy, value
      light: '#E4C574',
      dark: '#B08A2A',
    },
    background: {
      default: '#0D2137',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A2E',
      secondary: '#5A6478',
    },
    success: {
      main: '#2E7D4F',
      light: '#E8F5ED',
    },
    warning: {
      main: '#D4A843',
      light: '#FFF8E6',
    },
    info: {
      main: '#1A3A5C',
      light: '#E8EEF5',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    subtitle1: {
      fontSize: '1.1rem',
      fontWeight: 400,
      color: '#5A6478',
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.6,
    },
    overline: {
      fontWeight: 600,
      letterSpacing: '0.12em',
      fontSize: '0.7rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 24px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.06)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 6,
        },
      },
    },
  },
})

export default theme
