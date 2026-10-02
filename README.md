# Natural Chain

A Next.js demonstration of recording natural-gas supply-chain stages on BSV. The interface follows a shipment through wellhead, gathering, processing, transmission, storage and LNG export stages.

The application generates example readings and records their hashes through a server-held wallet. It does not ingest live sensor feeds, independently certify emissions or issue carbon credits.

## What the demonstration does

- Generates sample operational data for each stage.
- Hashes the submitted JSON and creates a one-satoshi PushDrop output in the wallet's `natural gas` basket.
- Attempts to spend the preceding stage's output when recording the next stage.
- Stores submission details in wallet output metadata and the browser's IndexedDB database.
- Displays the current session's progress and transaction references.

Transactions use **mainnet**, which is fixed in the server code. A funded server wallet and compatible wallet storage provider are required. Browser wallet installation is not required: the interface uses the application's HTTP wallet API.

## Run locally

Use Node.js 22.13 or later in the 22.x release line, and npm.

```sh
npm ci
```

Create `.env.local` in the repository root:

```dotenv
WALLET_ROOT_KEY_HEX=<your-server-wallet-private-key>
WALLET_STORAGE_URL=<your-mainnet-wallet-storage-url>
```

Start a local development server:

```sh
npm run dev -- --hostname 127.0.0.1
```

Open `http://localhost:3000`. Recording stages can spend BSV and incur transaction fees.

## Current limitations

The `/api/[call]` route exposes wallet operations without request authentication or authorisation. Wallet initialisation also logs the configured private key. These behaviours must be corrected before exposing the application to other users or using a valuable wallet. Keep the current demonstration local and use a dedicated wallet.

**Clear All** clears the local session and stored submissions, and relinquishes up to 1,000 outputs from the wallet's entire `natural gas` basket. That operation is not scoped to the current browser session and does not reverse blockchain transactions.

The generated readings illustrate a workflow; recording their hashes does not establish that the underlying measurements are accurate.

## Build and development

```sh
npm run build
npm start -- --hostname 127.0.0.1
```

The application uses Next.js 16, React 19 and the BSV SDK and wallet toolbox. The existing `lint` script invokes `next lint`, which is unavailable in the installed Next.js major version. No test script is defined.

- [src/app/page.tsx](src/app/page.tsx): stage data and interface.
- [src/app/api/](src/app/api/): server wallet API.
- [package.json](package.json): dependencies and scripts.

## Licence

**Open BSV Licence v6.** See [LICENSE.txt](LICENSE.txt) for the full terms. The licence applies to this project's original code and documentation and restricts use to the BSV blockchain defined in the licence. Third-party code, assets and referenced standards retain their respective terms.
