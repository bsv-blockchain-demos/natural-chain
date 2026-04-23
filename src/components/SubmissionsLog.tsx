"use client"
import { Drawer, Paper, Typography, Stack, Box, Chip } from '@mui/material';
import { Submission } from '../app/page';

const SubmissionsLog: React.FC<{ submissions: Submission[] }> = ({ submissions }) => {
  if (submissions.length === 0) {
    return null
  }

  return (
    <Drawer
      anchor="bottom"
      open={true}
      variant="persistent"
      sx={{
        '& .MuiDrawer-paper': {
          height: 'auto',
          maxHeight: '28vh',
          overflowY: 'auto',
          borderTop: '2px solid',
          borderColor: 'secondary.main',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(8px)',
        }
      }}
    >
      <Paper elevation={0} sx={{ p: 2, m: 0, maxHeight: '24vh', overflowY: 'auto' }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          Transaction Log
        </Typography>
        {submissions.toSorted((a, b) => new Date(b.data.timestamp).getTime() - new Date(a.data.timestamp).getTime()).map((entry) => (
          <Stack
            sx={{
              minHeight: 36,
              borderBottom: '1px solid',
              borderColor: 'divider',
              py: 0.75,
              px: 1,
            }}
            direction="row"
            key={entry.txid || entry.step}
            spacing={2}
            alignItems="center"
            className='log-entry'
          >
            <Chip
              label={entry.step}
              size="small"
              sx={{
                minWidth: 90,
                fontWeight: 600,
                fontSize: '0.7rem',
                bgcolor: 'primary.main',
                color: 'white',
                textTransform: 'capitalize',
              }}
            />
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.secondary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.txid || 'pending...'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.7rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {new Date(entry.data.timestamp).toLocaleString()}
            </Typography>
          </Stack>
        ))}
      </Paper>
    </Drawer>
  )
}

export default SubmissionsLog
