import { WalletStorageManager, Services, Wallet, StorageClient } from '@bsv/wallet-toolbox-client'
import { KeyDeriver, PrivateKey } from '@bsv/sdk'

const createWallet = async () => {
  console.log({ WALLET_STORAGE_URL: process.env.WALLET_STORAGE_URL, WALLET_ROOT_KEY_HEX: process.env.WALLET_ROOT_KEY_HEX })
  const endpointUrl = process.env.WALLET_STORAGE_URL!
  const rootKey = PrivateKey.fromHex(process.env.WALLET_ROOT_KEY_HEX!)
  const keyDeriver = new KeyDeriver(rootKey)
  const storage = new WalletStorageManager(keyDeriver.identityKey)
  const chain = 'main'
  const services = new Services(chain)
  const wallet = new Wallet({
    chain,
    keyDeriver,
    storage,
    services,
  })
  const client = new StorageClient(wallet, endpointUrl)
  await storage.addWalletStorageProvider(client)
  await storage.makeAvailable()
  return wallet
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    console.log({ data })
    const wallet = await createWallet()
    const auth = await wallet.isAuthenticated({})
    console.log({ auth })

    // get the path from the request
    const path = req.url.split('/').pop()
    console.log({ path })

    let result: unknown

    // transmit the message to the wallet
    switch(path) {
      case 'createAction':
        result = await wallet.createAction(data)
        break
      case 'getPublicKey':
        result = await wallet.getPublicKey(data)
        break
      case 'createSignature':
        result = await wallet.createSignature(data)
        break
      case 'listOutputs':
        result = await wallet.listOutputs(data)
        break
      case 'listActions':
        result = await wallet.listActions(data)
        break
      case 'relinquishOutput':
        result = await wallet.relinquishOutput(data)
        break
      default:
        throw new Error('Invalid path')
    }

    // transmit the result as json
    return Response.json(result, { status: 200 })
  } catch (error) {
    console.error({ error })
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}