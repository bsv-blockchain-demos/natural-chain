"use client"
import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import WellheadCard from '../components/stages/WellheadCard';
import GatheringCard from '../components/stages/GatheringCard';
import ProcessingCard from '../components/stages/ProcessingCard';
import TransmissionCard from '../components/stages/TransmissionCard';
import StorageCard from '../components/stages/StorageCard';
import LNGExportCard from '../components/stages/LNGExportCard';
import ResultBox from '../components/ResultBox';
import { Utils, Hash, PushDrop, WalletProtocol, Random, Transaction, HTTPWalletJSON, CreateActionInput, Beef, BEEF, LockingScript } from '@bsv/sdk'
import SubmissionsLog from '@/components/SubmissionsLog';
import { saveSubmission, getAllSubmissions, clearAllSubmissions } from '@/utils/db';
import { useWallet } from '@/context/WalletContext';

export interface DataEntry {
  entryId: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  wellInfo?: {
    wellId: string;
    operator: string;
  };
  measurements?: {
    flowRateMcfh: number;
    pressurePsi: number;
    temperatureF: number;
    composition: {
      methanePct: number;
      ethanePct: number;
      propanePct: number;
      co2Pct: number;
      nitrogenPct: number;
    };
  };
  [key: string]: unknown;
}

export interface QueueEntry {
  data: DataEntry;
  txid: string;
  step: string;
}

export interface Submission {
  data: DataEntry;
  txid: string;
  step: string;
}

const SESSION_KEY = 'natural-chain-session-id'

function getOrCreateSessionId(): string {
  const existing = localStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const id = Utils.toBase64(Random(8))
  localStorage.setItem(SESSION_KEY, id)
  return id
}

const App: React.FC = () => {
  const wallet = useWallet();
  const [sessionId, setSessionId] = useState<string>('')
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [wellheadQueue, setWellheadQueue] = useState<QueueEntry[]>([]);
  const [gatheringQueue, setGatheringQueue] = useState<QueueEntry[]>([]);
  const [processingQueue, setProcessingQueue] = useState<QueueEntry[]>([]);
  const [transmissionQueue, setTransmissionQueue] = useState<QueueEntry[]>([]);
  const [storageQueue, setStorageQueue] = useState<QueueEntry[]>([]);
  const [lngExportQueue, setLngExportQueue] = useState<QueueEntry[]>([]);

  const checkUnspentSetQueues = async (w: HTTPWalletJSON, sid: string) => {
    const data = await w.listOutputs({
      includeTags: true,
      include: 'locking scripts',
      basket: 'natural gas',
      tags: [`session-${sid}`],
    })

    console.log({ data })

    const newWellHead: QueueEntry[] = []
    const newGathering: QueueEntry[] = []
    const newProcessing: QueueEntry[] = []
    const newTransmission: QueueEntry[] = []
    const newStorage: QueueEntry[] = []
    const newLngExport: QueueEntry[] = []

    if (data.outputs.length > 0) {
      data.outputs.forEach(out => {
        const { fields } = PushDrop.decode(LockingScript.fromHex(out.lockingScript as string))
        console.log({ fields })
        const d = JSON.parse(Utils.toUTF8(fields[0]))
        const queueEntry: Partial<QueueEntry> = { data: d, txid: out.outpoint.split('.')[0] }
        if (out.tags?.includes('wellhead')) {
          queueEntry.step = 'wellhead'
          newWellHead.push(queueEntry as QueueEntry)
        } else if (out.tags?.includes('gathering')) {
          queueEntry.step = 'gathering'
          newGathering.push(queueEntry as QueueEntry)
        } else if (out.tags?.includes('processing')) {
          queueEntry.step = 'processing'
          newProcessing.push(queueEntry as QueueEntry)
        } else if (out.tags?.includes('transmission')) {
          queueEntry.step = 'transmission'
          newTransmission.push(queueEntry as QueueEntry)
        } else if (out.tags?.includes('storage')) {
          queueEntry.step = 'storage'
          newStorage.push(queueEntry as QueueEntry)
        } else if (out.tags?.includes('lng export')) {
          queueEntry.step = 'lng export'
          newLngExport.push(queueEntry as QueueEntry)
        }
      })
    }
    return { newWellHead, newGathering, newProcessing, newTransmission, newStorage, newLngExport }
  }

  // Sync unspent tokens from wallet for the current session
  const syncFromWallet = async (w: HTTPWalletJSON, sid: string) => {
    try {
      const { newWellHead, newGathering, newProcessing, newTransmission, newStorage, newLngExport } = await checkUnspentSetQueues(w, sid)
      console.log({ newWellHead, newGathering, newProcessing, newTransmission, newStorage, newLngExport })
      setWellheadQueue(newWellHead)
      setGatheringQueue(newGathering)
      setProcessingQueue(newProcessing)
      setTransmissionQueue(newTransmission)
      setStorageQueue(newStorage)
      setLngExportQueue(newLngExport)
      // Reconstruct submissions list from wallet outputs
      const all = [...newWellHead, ...newGathering, ...newProcessing, ...newTransmission, ...newStorage, ...newLngExport]
      setSubmissions(all.map(q => ({ data: q.data, txid: q.txid, step: q.step })))
    } catch (error) {
      console.error('Failed to sync from wallet:', error);
    }
  };

  useEffect(() => {
    const sid = getOrCreateSessionId()
    setSessionId(sid)
    if (wallet) syncFromWallet(wallet, sid)
  }, [wallet]);

  const grabTokenFromPreviousStep = (step: string): QueueEntry | undefined => {
    switch (step) {
      case 'wellhead':   return undefined
      case 'gathering':  return wellheadQueue[0]
      case 'processing': return gatheringQueue[0]
      case 'transmission': return processingQueue[0]
      case 'storage':    return transmissionQueue[0]
      case 'lng export': return storageQueue[0]
      default:           return undefined
    }
  }

  const stepHasSubmission = (step: string) => submissions.some(s => s.step === step);

  const handleClearAll = () => {
    const newId = Utils.toBase64(Random(8))
    localStorage.setItem(SESSION_KEY, newId)
    setSessionId(newId)
    clearAllSubmissions().catch(console.error)
    setSubmissions([]);
    setWellheadQueue([]);
    setGatheringQueue([]);
    setProcessingQueue([]);
    setTransmissionQueue([]);
    setStorageQueue([]);
    setLngExportQueue([]);

    // Background: relinquish all natural gas basket outputs so they don't clog the wallet
    if (wallet) {
      wallet.listOutputs({ basket: 'natural gas', limit: 1000 }).then(result => {
        result.outputs.forEach(out => {
          const [txid, voutStr] = out.outpoint.split('.')
          wallet.relinquishOutput({ basket: 'natural gas', output: `${txid}.${voutStr}` }).catch(() => {})
        })
      }).catch(() => {})
    }
  };

  const handleSubmitData = (step: string, data: DataEntry) => {
    step = step.toLowerCase()
    if (stepHasSubmission(step) || !wallet) return;

    const entryId = Utils.toBase64(Random(8))
    data.entryId = entryId
    data.timestamp = new Date().toISOString()
    data = simulatedData(data)

    const spend = grabTokenFromPreviousStep(step)

    // Optimistic update — UI responds instantly with pending state
    const pending = { step, data, txid: '' };
    setSubmissions(prev => [...prev, pending]);
    switch (step) {
      case 'wellhead':
        setWellheadQueue(prev => [...prev, { data, txid: '', step }])
        break
      case 'gathering':
        setGatheringQueue(prev => [...prev, { data, txid: '', step }])
        setWellheadQueue(prev => prev.slice(1))
        break
      case 'processing':
        setProcessingQueue(prev => [...prev, { data, txid: '', step }])
        setGatheringQueue(prev => prev.slice(1))
        break
      case 'transmission':
        setTransmissionQueue(prev => [...prev, { data, txid: '', step }])
        setProcessingQueue(prev => prev.slice(1))
        break
      case 'storage':
        setStorageQueue(prev => [...prev, { data, txid: '', step }])
        setTransmissionQueue(prev => prev.slice(1))
        break
      case 'lng export':
        setLngExportQueue(prev => [...prev, { data, txid: '', step }])
        setStorageQueue(prev => prev.slice(1))
        break
    }

    // Background wallet call — resolves when BSV tx is confirmed
    Promise.resolve(spend).then(spendEntry =>
      createTokenOnBSV(wallet, data, step, sessionId, spendEntry)
    ).then(({ txid }) => {
      setSubmissions(prev => prev.map(s =>
        s.step === step && s.txid === '' ? { ...s, txid } : s
      ))
      saveSubmission({ step, data, txid }).catch(console.error)
    }).catch(error => {
      console.error('Error creating token on BSV:', error)
    })
  }

  /**
   * Simulates data by adding 10% random variability to numeric values in the example data
   * @param data The example data to be varied
   * @returns The simulated data
   */
  function simulatedData(data: DataEntry): DataEntry {
    for (const key in data) {
      const value = data[key];
      if (typeof value === 'number') {
        const variance = value * 0.1; // 10% of the value
        const randomFactor = Math.random() * 2 - 1; // Random value between -1 and 1
        data[key] = (value + (variance * randomFactor)) as number;
      } else if (typeof value === 'object' && value !== null) {
        const nested = value as Record<string, number>;
        for (const nestedKey in nested) {
          const nestedVal = nested[nestedKey];
          if (typeof nestedVal === 'number') {
            const nestedVariance = nestedVal * 0.1;
            const nestedRandomFactor = Math.random() * 2 - 1;
            nested[nestedKey] = (nestedVal + (nestedVariance * nestedRandomFactor)) as number;
          }
        }
      }
    }
    return data
  }

  /**
   * Uses the BSV Blockchain to create a token capturing the data as a hash, timestamping it, 
   * and assigning ownership to the token which represents the volume of gas.
   * 
   * @param data The data to be stored
   * @param step The step of the process
   * @returns The transaction ID
   */
  async function createTokenOnBSV(wallet: HTTPWalletJSON, data: DataEntry, step: string, sid: string, spend?: QueueEntry | null): Promise<{ txid: string }> {

    // Create a hash of the data
    const sha = Hash.sha256(JSON.stringify(data))
    const shasha = Hash.sha256(sha)

    // Create a new pushdrop token
    const pushdrop = new PushDrop(wallet)
    const customInstructions = {
        protocolID: [0, 'natural gas data integrity'] as WalletProtocol,
        keyID: Utils.toBase64(sha)
    }

    // Create a locking script for the pushdrop token
    const lockingScript = await pushdrop.lock(
      [Utils.toArray(step, 'utf8'), shasha],
      customInstructions.protocolID,
      customInstructions.keyID,
      'self',
      true,
      true
    )

    let inputs: CreateActionInput[] | undefined = undefined
    let knownTxids: string[] | undefined = undefined
    let inputBEEF: BEEF | undefined = undefined
    if (spend) {
      const sha = Hash.sha256(JSON.stringify(spend.data))
      const customInstructions = {
        protocolID: [0, 'natural gas data integrity'] as WalletProtocol,
        keyID: Utils.toBase64(sha)
      }
      const tokens = await wallet.listOutputs({
        basket: 'natural gas',
        includeCustomInstructions: true,
        include: 'entire transactions',
        limit: 1000
      })

      console.log({ outputs: tokens.outputs })

      const beef = Beef.fromBinary(tokens.BEEF as number[])

      if (tokens.totalOutputs > 0) {
        // pick the output to spend based on available tokens matching this keyID
        const output = tokens.outputs.find(output => {
          const c = JSON.parse(output.customInstructions as string)
          return customInstructions.keyID === c.keyID
        })
        if (output) {
          const [txid, voutStr] = output.outpoint.split('.')
          const vout = parseInt(voutStr)
          const sourceTransaction = beef.findAtomicTransaction(txid) as Transaction
          // Spend the current state of the token to create an immutable chain of custody
          const unlockingScriptTemplate = pushdrop.unlock(
            customInstructions.protocolID,
            customInstructions.keyID,
            'self',
            'single',
            true,
            1,
            sourceTransaction.outputs[vout].lockingScript
          )
          const txDummy = new Transaction()
          if (!knownTxids) {
            knownTxids = []
          }
          knownTxids.push(txid)

          txDummy.addInput({
            sourceTransaction,
            sourceOutputIndex: vout,
            unlockingScriptTemplate
          })

          txDummy.addOutput({
            lockingScript,
            satoshis: 1,
          })
          await txDummy.sign()
          if (!inputs) {
            inputs = []
          }
          const nb = new Beef()
          nb.mergeTransaction(sourceTransaction)
          console.log(nb.toLogString())
          inputBEEF = nb.toBinary()
          inputs.push({
            unlockingScript: txDummy.inputs[0].unlockingScript?.toHex() as string,
            outpoint: output.outpoint,
            inputDescription: 'natural gas supply chain token'
          })
        }
      }
    }

    const outputs = [{
      lockingScript: lockingScript.toHex(),
      satoshis: 1,
      outputDescription: 'natural gas supply chain token',
      customInstructions: JSON.stringify(customInstructions),
      basket: 'natural gas',
      tags: [step, `session-${sid}`]
    }]


    const res = await wallet.createAction({
      inputBEEF,
      description: 'record data within an NFT for natural gas supply chain tracking',
      labels: [step],
      inputs,
      outputs,
      options: {
        trustSelf: 'known',
        knownTxids,
        randomizeOutputs: false
      }
    })
    return { txid: res.txid as string }
  }

  const simulateData = {
    wellhead: {
      entryId: 'whd-001234567',
      timestamp: new Date().toISOString(),
      location: { latitude: 31.9686, longitude: -99.9018 },
      wellInfo: { wellId: 'TX-WELL-087654', operator: 'TexStar Energy LLC' },
      measurements: {
        flowRateMcfh: 1050.75,
        pressurePsi: 1450,
        temperatureF: 95.3,
        composition: {
          methanePct: 89.5,
          ethanePct: 4.1,
          propanePct: 1.8,
          co2Pct: 0.6,
          nitrogenPct: 4.0
        },
      },
    },
    gathering: {
      entryId: 'ctp-987654321',
      timestamp: new Date().toISOString(),
      transferLocation: 'Gathering Point A32',
      operatorFrom: 'TexStar Energy LLC',
      operatorTo: 'BlueLine Pipelines Inc.',
      volumeTransferredMcf: 24500.50,
      pressurePsi: 1350,
      energyContentBTUcf: 1035,
      composition: {
        methanePct: 90.1,
        ethanePct: 4.0,
        propanePct: 1.7,
        co2Pct: 0.5,
        nitrogenPct: 3.7
      },
    },
    processing: {
      entryId: 'ppd-112233445',
      timestamp: new Date().toISOString(),
      processingFacility: { facilityId: 'Eagle Ford Processing Plant #4', operator: 'Eagle Gas Processors Ltd.' },
      inputVolumeMcf: 120000,
      outputVolumeMcf: 115800,
      processingLossPct: 3.5,
      energyContentOutBTUcf: 1040,
      compositionOut: {
        methanePct: 92.8,
        ethanePct: 3.5,
        propanePct: 1.5,
        co2Pct: 0.4,
        nitrogenPct: 1.8
      },
    },
    transmission: {
      entryId: 'tpd-556677889',
      timestamp: new Date().toISOString(),
      pipelineSegment: { segmentId: 'TransP-Section-18B', operator: 'Interstate Transmission Co.' },
      measurements: { 
        flowRateMcfh: 25500, 
        pressurePsi: 950, 
        temperatureF: 78.4 
      },
      composition: {
        methanePct: 92.7,
        ethanePct: 3.6,
        propanePct: 1.4,
        co2Pct: 0.3,
        nitrogenPct: 2.0
      },
    },
    storage: {
      entryId: 'sfd-998877665',
      timestamp: new Date().toISOString(),
      storageFacility: { facilityId: 'Gulf Coast Storage Hub 12', operator: 'Southern Storage Partners' },
      operation: 'injection',
      volumeMcf: 75000,
      storagePressurePsi: 1700,
      inventoryLevelPct: 68.2,
      composition: {
        methanePct: 92.6,
        ethanePct: 3.7,
        propanePct: 1.3,
        co2Pct: 0.3,
        nitrogenPct: 2.1
      },
    },
    lngExport: {
      entryId: 'lng-443322110',
      timestamp: new Date().toISOString(),
      lngTerminal: { terminalId: 'Freeport LNG Export Terminal', operator: 'Freeport LNG LLC' },
      vessel: { vesselId: 'LNG Tanker Neptune Star', destinationPort: 'Rotterdam, Netherlands' },
      exportVolumeMcf: 300000,
      energyContentBTUcf: 1045,
      composition: {
        methanePct: 92.9,
        ethanePct: 3.5,
        propanePct: 1.4,
        co2Pct: 0.2,
        nitrogenPct: 2.0
      },
    }
  };

  const boxSx = {
    display: 'flex',
    gap: 2,
    alignItems: 'center',
    flexDirection: { xs: 'column', md: 'row' }
  };

  const cardSx = {
    width: { xs: '100%', sm: '100%', md: '50%', lg: '40%' },
    minWidth: { md: '350px' },
    flexShrink: 0
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, minHeight: '100vh', display: 'flex', flexDirection: 'column', pt: 10, pb: 40 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', py: 5 }}>
        <Typography variant="h4" align="center" color="white" gutterBottom sx={{ fontWeight: 'bold', textShadow: '2px 1px 2px black', mb: 0 }}>
          Natural Gas Blockchain Demo
        </Typography>
        {submissions.length > 0 && (
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={handleClearAll}
            sx={{ background: 'rgba(255, 255, 255, 1)', position: 'absolute', right: 0 }}
          >
            Clear All
          </Button>
        )}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={boxSx}>
          <Box sx={cardSx}><WellheadCard data={simulateData.wellhead} onSubmit={handleSubmitData} disabled={stepHasSubmission('wellhead')} /></Box>
          {submissions.filter(s => s.step === 'wellhead').map(s => (
            <ResultBox key={s.txid} entry={s} />
          ))}
        </Box>
        <Box sx={boxSx}>
          <Box sx={cardSx}><GatheringCard data={simulateData.gathering} onSubmit={handleSubmitData} disabled={stepHasSubmission('gathering')} /></Box>
          {submissions.filter(s => s.step === 'gathering').map(s => (
            <ResultBox key={s.txid} entry={s} />
          ))}
        </Box>
        <Box sx={boxSx}>
          <Box sx={cardSx}><ProcessingCard data={simulateData.processing} onSubmit={handleSubmitData} disabled={stepHasSubmission('processing')} /></Box>
          {submissions.filter(s => s.step === 'processing').map(s => (
            <ResultBox key={s.txid} entry={s} />
          ))}
        </Box>
        <Box sx={boxSx}>
          <Box sx={cardSx}><TransmissionCard data={{
                ...simulateData.transmission,
                measurements: {
                  ...simulateData.transmission.measurements,
                  composition: {
                    methanePct: 90,
                    ethanePct: 5,
                    propanePct: 3,
                    co2Pct: 1,
                    nitrogenPct: 1
                  }
                }
          }} onSubmit={handleSubmitData} disabled={stepHasSubmission('transmission')} /></Box>
          {submissions.filter(s => s.step === 'transmission').map(s => (
            <ResultBox key={s.txid} entry={s} />
          ))}
        </Box>
        <Box sx={boxSx}>
          <Box sx={cardSx}><StorageCard data={simulateData.storage} onSubmit={handleSubmitData} disabled={stepHasSubmission('storage')} /></Box>
          {submissions.filter(s => s.step === 'storage').map(s => (
            <ResultBox key={s.txid} entry={s} />
          ))}
        </Box>
        <Box sx={boxSx}>
          <Box sx={cardSx}><LNGExportCard data={simulateData.lngExport} onSubmit={handleSubmitData} disabled={stepHasSubmission('lng export')} /></Box>
          {submissions.filter(s => s.step === 'lng export').map(s => (
            <ResultBox key={s.txid} entry={s} />
          ))}
        </Box>
      </Box>
      <SubmissionsLog submissions={submissions} />
    </Container>
  );
};

export default App;
