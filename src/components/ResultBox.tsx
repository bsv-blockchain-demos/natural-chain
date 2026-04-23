"use client"
import React, { useState } from 'react';
import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import RefreshIcon from '@mui/icons-material/Refresh';
import { QueueEntry } from '../app/page';
import { useWallet } from '@/context/WalletContext';

interface ResultBoxProps {
  entry: QueueEntry,
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

  const isPending = !startingData.txid

  if (!startingData) {
    return <Box sx={{ my: 3,
      height: 150, border: '1px dashed #ccc', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
      sm: { width: '100%' },
      md: { width: '60%' } }}>
      <Typography variant="body1" color="textSecondary">No tokens yet.</Typography>
    </Box>
  }

  return (
    <Box onClick={getStatus} sx={{ overflow: 'hidden', my:3, sm: { width: '60%' }, md: {width: '60%' }, position: 'relative', height: 'auto', border: '1px solid #ccc', borderRadius: 0, p: 2, backgroundColor: isPending ? '#f5f0e6' : '#e6f3e6' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {isPending ? 'Recording to Blockchain...' : 'Immutable Record Details:'}
      </Typography>
      <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
        {isPending
          ? <CircularProgress size={24} />
          : <IconButton size="large" aria-label="refresh"><RefreshIcon fontSize="small" /></IconButton>
        }
      </Box>
      {entry && (
        <>
          {entry.entryId && <Typography variant="body2">Entry ID: {entry.entryId}</Typography>}
          {entry.timestamp && <Typography variant="body2">Timestamp: {entry.timestamp}</Typography>}
          {Object.entries(entry).map(([key, value]) => (
            <Typography key={key} variant="body2">
              {key}: {String(value)}
            </Typography>
          ))}
        </>
      )}
      {actionStatus && <Typography variant="body2">Transaction status: {actionStatus}</Typography>}
      {entry.txid && actionStatus === 'completed' && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <IconButton onClick={(e) => { e.stopPropagation(); window.open(`https://whatsonchain.com/tx/${entry.txid}`, '_blank') }}>
            <LinkIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  )
}

export default ResultBox
