"use client"
import { SxProps, Theme } from '@mui/material';

export const cardMediaSx: SxProps<Theme> = {
  aspectRatio: '1.67',
  width: '100%',
  height: 'auto',
  objectFit: 'cover',
  filter: 'saturate(0.85) brightness(0.95)',
  transition: 'filter 0.3s ease',
  '.MuiCardActionArea-root:hover &': {
    filter: 'saturate(1) brightness(1)',
  },
};

export const cardContainerSx: SxProps<Theme> = {
  width: '100%',
  height: 'auto',
  borderRadius: 2,
  overflow: 'hidden',
  border: '1px solid rgba(0,0,0,0.06)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 12px 28px rgba(13,33,55,0.12), 0 4px 10px rgba(13,33,55,0.08)',
  },
};

export const disabledCardSx: SxProps<Theme> = {
  opacity: 0.6,
  cursor: 'not-allowed',
  '&:hover': {
    transform: 'none',
    boxShadow: 'none',
  },
};

export const cardTitleSx: SxProps<Theme> = {
  fontSize: '1.05rem',
  fontWeight: 600,
  color: '#0D2137',
  letterSpacing: '-0.01em',
};

export const cardDescriptionSx: SxProps<Theme> = {
  fontSize: '0.8125rem',
  color: '#5A6478',
  lineHeight: 1.5,
};
