"use client"
import React from 'react';
import { Card, CardActionArea, CardContent, CardMedia, Typography } from '@mui/material';
import { DataEntry } from '../../app/page';
import { cardMediaSx, cardContainerSx, cardTitleSx, cardDescriptionSx } from '../styles/CardStyles';

interface ProcessingCardProps {
  data: DataEntry;
  onSubmit: (step: string, data: DataEntry) => void;
  disabled?: boolean;
}

const ProcessingCard: React.FC<ProcessingCardProps> = ({ data, onSubmit, disabled }) => {
  return (
    <Card sx={{ ...cardContainerSx, ...(disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}) }}>
      <CardActionArea onClick={() => onSubmit('Processing', data)} disabled={disabled}>
        <CardMedia
          component="img"
          image="/images/processing-plant.png"
          alt="Processing Plant"
          sx={cardMediaSx}
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div" sx={cardTitleSx}>
            Processing Plant
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={cardDescriptionSx}>
            Submit data from processing facilities about input/output volumes
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default ProcessingCard;
