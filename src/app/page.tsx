"use client"
import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, CircularProgress, Backdrop } from '@mui/material';
import WellheadCard from '../components/stages/WellheadCard';
import GatheringCard from '../components/stages/GatheringCard';
import ProcessingCard from '../components/stages/ProcessingCard';
import TransmissionCard from '../components/stages/TransmissionCard';
import StorageCard from '../components/stages/StorageCard';
import LNGExportCard from '../components/stages/LNGExportCard';
import ResultBox from '../components/ResultBox';
import { Utils, Hash, PushDrop, WalletProtocol, Random, Transaction, HTTPWalletJSON, ARC, CreateActionInput, Beef, BEEF, WhatsOnChain } from '@bsv/sdk'
import SubmissionsLog from '@/components/SubmissionsLog';
import { saveSubmission, getAllSubmissions } from '@/utils/db';

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
  arc: unknown;
}

type BitailsResponse = {
  txid: string;
  outputs: Array<{
    index: number;
    spent: string;
  }>;
}

const App: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [wellheadQueue, setWellheadQueue] = useState<QueueEntry[]>([]);
  const [gatheringQueue, setGatheringQueue] = useState<QueueEntry[]>([]);
  const [processingQueue, setProcessingQueue] = useState<QueueEntry[]>([]);
  const [transmissionQueue, setTransmissionQueue] = useState<QueueEntry[]>([]);
  const [storageQueue, setStorageQueue] = useState<QueueEntry[]>([]);
  const [lngExportQueue, setLngExportQueue] = useState<QueueEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState<string | null>(null);

  const checkUnspentSetQueues = async (submissions: Submission[]) => {
    const txsIds = submissions.map(s => s.txid)
    const bitails: BitailsResponse[] = await (await fetch('https://api.bitails.io/tx/multi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txsIds })
    })).json()
    console.log({bitails})
    const unspentSubmissions = submissions.filter(s => {
      const tx = bitails.find(b => b?.txid === s.txid)
      console.log({ s: s.txid, spent: !!tx?.outputs[0].spent })
      return !tx?.outputs[0].spent
    })
    if (unspentSubmissions.length > 0) {
      // add unspent tokens to the appropriate queue
      const newWellHead: QueueEntry[] = []
      const newGathering: QueueEntry[] = []
      const newProcessing: QueueEntry[] = []
      const newTransmission: QueueEntry[] = []
      const newStorage: QueueEntry[] = []
      const newLngExport: QueueEntry[] = []
      unspentSubmissions.forEach(token => {
        switch (token.step) {
          case 'Wellhead':
            newWellHead.push(token)
            break
          case 'Gathering':
            newGathering.push(token)
            break
          case 'Processing':
            newProcessing.push(token)
            break
          case 'Transmission':
            newTransmission.push(token)
            break
          case 'Storage':
            newStorage.push(token)
            break
          case 'LNG Export':
            newLngExport.push(token)
            break
        }
      })
      return { newWellHead, newGathering, newProcessing, newTransmission, newStorage, newLngExport }
    }
    return { newWellHead: [], newGathering: [], newProcessing: [], newTransmission: [], newStorage: [], newLngExport: [] }
  }

  // Load submissions from IndexedDB
  const loadSubmissions = async () => {
    try {
      const submissions = await getAllSubmissions();
      if (submissions && submissions.length > 0) {
        // check for unspent tokens:
        const { newWellHead, newGathering, newProcessing, newTransmission, newStorage, newLngExport } = await checkUnspentSetQueues(submissions)
        console.log({ newWellHead, newGathering, newProcessing, newTransmission, newStorage, newLngExport })
        setSubmissions(submissions)
        setWellheadQueue(newWellHead)
        setGatheringQueue(newGathering)
        setProcessingQueue(newProcessing)
        setTransmissionQueue(newTransmission)
        setStorageQueue(newStorage)
        setLngExportQueue(newLngExport)
      }
    } catch (error) {
      console.error('Failed to load submissions from IndexedDB:', error);
    }
  };


  useEffect(() => {
    loadSubmissions()
  }, []);

  const grabTokenFromPreviousStep = async (step: string) => {
    switch (step) {
        case 'Wellhead':
          return undefined
        case 'Gathering':
          return wellheadQueue[0]
        case 'Processing':
          return gatheringQueue[0]
        case 'Transmission':
          return processingQueue[0]
        case 'Storage':
          return transmissionQueue[0]
        case 'LNG Export':
          return storageQueue[0]
      }
  }

  const stepHasSubmission = (step: string) => submissions.some(s => s.step === step);

  const handleSubmitData = async (step: string, data: DataEntry) => {
    if (stepHasSubmission(step) || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setSubmittingStep(step);
      
      const entryId = Utils.toBase64(Random(8))
      data.entryId = entryId
      data.timestamp = new Date().toISOString()
      data = simulatedData(data)

      const spend = await grabTokenFromPreviousStep(step)

      const { txid, arc } = await createTokenOnBSV(data, step, spend)

      const newSubmission = { step, data, txid, arc };
      
      // Save to IndexedDB
      try {
        await saveSubmission(newSubmission);
      } catch (error) {
        console.error('Failed to save submission to IndexedDB:', error);
      }
      
      setSubmissions(prev => [...prev, newSubmission]);

      switch (step) {
        case 'Wellhead':
          setWellheadQueue((prev) => [...prev, { data, txid, step }])
          break
        case 'Gathering':
          setGatheringQueue((prev) => [...prev, { data, txid, step }])
          setWellheadQueue((prev) => prev.slice(1))
          break
        case 'Processing':
          setProcessingQueue((prev) => [...prev, { data, txid, step }])
          setGatheringQueue((prev) => prev.slice(1))
          break
        case 'Transmission':
          setTransmissionQueue((prev) => [...prev, { data, txid, step }])
          setProcessingQueue((prev) => prev.slice(1))
          break
        case 'Storage':
          setStorageQueue((prev) => [...prev, { data, txid, step }])
          setTransmissionQueue((prev) => prev.slice(1))
          break
        case 'LNG Export':
          setLngExportQueue((prev) => [...prev, { data, txid, step }])
          setStorageQueue((prev) => prev.slice(1))
          break
      }
    } catch (error) {
      console.error('Error submitting data:', error);
    } finally {
      setIsSubmitting(false);
      setSubmittingStep(null);
    }
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
   * @returns The transaction ID and broadcast response
   */
  async function createTokenOnBSV(data: DataEntry, step: string, spend?: QueueEntry | null): Promise<{ txid: string, arc: unknown }> {
    
    // Initialize the wallet client with the remote signer to emulate IoT Device signing off on its data.
    const baseUrl = window.location.origin
    const wallet = new HTTPWalletJSON(baseUrl, `${baseUrl}/api`)

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
      true,
      'after'
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
      basket: 'natural gas'
    }]


    const res = await wallet.createAction({
      inputBEEF,
      description: 'record data within an NFT for natural gas supply chain tracking',
      inputs,
      outputs,
      options: {
        trustSelf: 'known',
        knownTxids,
        randomizeOutputs: false
      }
    })
    const tx = Transaction.fromAtomicBEEF(res.tx as number[])
    const arc = await tx.broadcast(new ARC('https://arc.taal.com'))
    console.log({ arc })
    return { txid: res.txid as string, arc }
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
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isSubmitting}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          bgcolor: 'rgba(0,0,0,0.7)',
          p: 3,
          borderRadius: 2
        }}>
          <CircularProgress color="primary" />
          <Typography variant="h6" sx={{ mt: 2, color: 'white' }}>
            {submittingStep ? `Processing ${submittingStep} data...` : 'Processing...'}
          </Typography>
        </Box>
      </Backdrop>
      <Typography variant="h4" align="center" color="white" gutterBottom sx={{ py: 5,fontWeight: 'bold', textShadow: '2px 1px 2px black' }}>
        Natural Gas Blockchain Demo
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={boxSx}>
          <Box sx={cardSx}><WellheadCard data={simulateData.wellhead} onSubmit={handleSubmitData} disabled={stepHasSubmission('Wellhead')} /></Box>
          {submissions.filter(s => s.step === 'Wellhead').map(s => (
            <ResultBox key={s.txid} entry={s} />
          ))}
        </Box>
        <Box sx={boxSx}>
          <Box sx={cardSx}><GatheringCard data={simulateData.gathering} onSubmit={handleSubmitData} disabled={stepHasSubmission('Gathering')} /></Box>
          {submissions.filter(s => s.step === 'Gathering').map(s => (
            <ResultBox key={s.txid} entry={s} />
          ))}
        </Box>
        <Box sx={boxSx}>
          <Box sx={cardSx}><ProcessingCard data={simulateData.processing} onSubmit={handleSubmitData} disabled={stepHasSubmission('Processing')} /></Box>
          {submissions.filter(s => s.step === 'Processing').map(s => (
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
          }} onSubmit={handleSubmitData} disabled={stepHasSubmission('Transmission')} /></Box>
          {submissions.filter(s => s.step === 'Transmission').map(s => (
            <ResultBox key={s.txid} entry={s} />
          ))}
        </Box>
        <Box sx={boxSx}>
          <Box sx={cardSx}><StorageCard data={simulateData.storage} onSubmit={handleSubmitData} disabled={stepHasSubmission('Storage')} /></Box>
          {submissions.filter(s => s.step === 'Storage').map(s => (
            <ResultBox key={s.txid} entry={s} />
          ))}
        </Box>
        <Box sx={boxSx}>
          <Box sx={cardSx}><LNGExportCard data={simulateData.lngExport} onSubmit={handleSubmitData} disabled={stepHasSubmission('LNG Export')} /></Box>
          {submissions.filter(s => s.step === 'LNG Export').map(s => (
            <ResultBox key={s.txid} entry={s} />
          ))}
        </Box>
      </Box>
      <SubmissionsLog submissions={submissions} />
    </Container>
  );
};

export default App;
