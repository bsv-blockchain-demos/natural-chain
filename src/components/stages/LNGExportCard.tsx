"use client"
import React from 'react';
import { Card, CardActionArea, CardContent, CardMedia, Typography } from '@mui/material';
import { DataEntry } from '../../app/page';
import { cardMediaSx, cardContainerSx, cardTitleSx, cardDescriptionSx } from '../styles/CardStyles';

interface LNGExportCardProps {
  data: DataEntry;
  onSubmit: (step: string, data: DataEntry) => void;
  disabled?: boolean;
}

const LNGExportCard: React.FC<LNGExportCardProps> = ({ data, onSubmit, disabled }) => {
  return (
    <Card sx={{ ...cardContainerSx, ...(disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}) }}>
      <CardActionArea onClick={() => onSubmit('LNG Export', data)} disabled={disabled}>
        <CardMedia
          component="img"
          image="/images/LNG-export-data.png"
          alt="LNG Export"
          sx={cardMediaSx}
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div" sx={cardTitleSx}>
            LNG Export
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={cardDescriptionSx}>
            Submit LNG export terminal data and shipment details
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default LNGExportCard;
