"use client"
import React from 'react';
import { Card, CardActionArea, CardContent, CardMedia, Typography } from '@mui/material';
import { DataEntry } from '../../app/page';
import { cardMediaSx, cardContainerSx, cardTitleSx, cardDescriptionSx } from '../styles/CardStyles';

interface GatheringCardProps {
  data: DataEntry;
  onSubmit: (step: string, data: DataEntry) => void;
  disabled?: boolean;
}

const GatheringCard: React.FC<GatheringCardProps> = ({ data, onSubmit, disabled }) => {
  return (
    <Card sx={{ ...cardContainerSx, ...(disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}) }}>
      <CardActionArea onClick={() => onSubmit('Gathering', data)} disabled={disabled}>
        <CardMedia
          component="img"
          image="/images/gathering-pipeline.png"
          alt="Gathering Pipeline"
          sx={cardMediaSx}
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div" sx={cardTitleSx}>
            Gathering Pipeline Custody
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={cardDescriptionSx}>
            Submit data for gathering pipeline transfer and custody changes
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default GatheringCard;
