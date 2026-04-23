"use client"
import React, { useState } from 'react';
import { Box, Chip, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Submission } from '../app/page';
import { useWallet } from '@/context/WalletContext';

interface ResultBoxProps {
  entry: Submission,
}

const DISPLAY_LABELS: Record<string, string> = {
  'data.entryId': 'Entry ID',
  'data.timestamp': 'Timestamp',
  'data.location.latitude': 'Latitude',
  'data.location.longitude': 'Longitude',
  'data.wellInfo.wellId': 'Well ID',
  'data.wellInfo.operator': 'Operator',
  'data.measurements.flowRateMcfh': 'Flow Rate (Mcf/h)',
  'data.measurements.pressurePsi': 'Pressure (PSI)',
  'data.measurements.temperatureF': 'Temperature (F)',
}

const ResultBox: React.FC<ResultBoxProps> = ({ entry: startingData }) => {
  const wallet = useWallet()
  const [actionStatus, setActionStatus] = useState<string | null>(null)

  const getStatus = async () => {
    if (!wallet) return
    const res = await wallet.listActions({
      labels: [startingData.step],
      includeLabels: true,
    })
    const match = res.actions.find(a => a.txid === startingData.txid)
    setActionStatus(match?.status ?? 'not found')
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const flatJSON = (obj: any, parentKey = '') => {
    const result: any = {}
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        Object.assign(result, flatJSON(obj[key], parentKey + (parentKey ? '.' : '') + key))
      } else {
        result[parentKey + (parentKey ? '.' : '') + key] = obj[key]
      }
    }
    return result
  }

  const entry = flatJSON(startingData)
  const isPending = !startingData.txid && !startingData.error
  const isError = !!startingData.error

  if (!startingData) {
    return (
      <Box sx={{
        my: 2, height: 120, border: '1px dashed', borderColor: 'divider',
        borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%',
      }}>
        <Typography variant="body2" color="text.secondary">No tokens yet.</Typography>
      </Box>
    )
  }

  return (
    <Box
      onClick={getStatus}
      sx={{
        overflow: 'hidden',
        my: 1,
        width: '100%',
        position: 'relative',
        border: '1px solid',
        borderColor: isError ? 'error.main' : isPending ? 'warning.main' : 'success.main',
        borderLeft: '4px solid',
        borderLeftColor: isError ? 'error.main' : isPending ? 'warning.main' : 'success.main',
        borderRadius: 1.5,
        p: 2,
        backgroundColor: isError ? '#FFF0F0' : isPending ? 'warning.light' : 'success.light',
        cursor: isError ? 'default' : 'pointer',
        transition: 'box-shadow 0.15s ease',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="overline" sx={{ color: isError ? 'error.main' : isPending ? 'warning.dark' : 'success.dark' }}>
            {isError ? 'Transaction Failed' : isPending ? 'Recording to Blockchain' : 'On-Chain Record'}
          </Typography>
          {actionStatus && !isError && (
            <Chip
              label={actionStatus}
              size="small"
              color={actionStatus === 'completed' ? 'success' : 'warning'}
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
            />
          )}
        </Box>
        <Box>
          {isError
            ? (
              <Tooltip title={startingData.error} placement="left">
                <ErrorOutlineIcon sx={{ fontSize: 20, color: 'error.main' }} />
              </Tooltip>
            )
            : isPending
            ? <CircularProgress size={18} sx={{ color: 'warning.dark' }} />
            : <IconButton size="small" aria-label="refresh status"><RefreshIcon fontSize="small" /></IconButton>
          }
        </Box>
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 0.5,
      }}>
        {Object.entries(entry).filter(([key]) => !['txid', 'step'].includes(key)).map(([key, value]) => (
          <Typography key={key} variant="body2" sx={{ color: 'text.secondary' }}>
            <Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
              {DISPLAY_LABELS[key] || key.split('.').pop()}:
            </Box>{' '}
            {typeof value === 'number' ? (value as number).toFixed(2) : String(value)}
          </Typography>
        ))}
      </Box>

      {isError && (
        <Typography variant="body2" sx={{ mt: 1.5, color: 'error.dark', fontSize: '0.72rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {startingData.error}
        </Typography>
      )}

      {entry.txid && (
        <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            TX: {entry.txid}
          </Typography>
          {actionStatus === 'completed' && (
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); window.open(`https://whatsonchain.com/tx/${entry.txid}`, '_blank') }}
              sx={{ ml: 'auto' }}
            >
              <OpenInNewIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
      )}
    </Box>
  )
}

export default ResultBox
