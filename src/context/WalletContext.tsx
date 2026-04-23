"use client"
import React, { createContext, useContext, useEffect, useState } from 'react'
import { HTTPWalletJSON } from '@bsv/sdk'

const WalletContext = createContext<HTTPWalletJSON | null>(null)

export function WalletProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [wallet, setWallet] = useState<HTTPWalletJSON | null>(null)

  useEffect(() => {
    const baseUrl = globalThis.location.origin
    setWallet(new HTTPWalletJSON(baseUrl, `${baseUrl}/api`))
  }, [])

  return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
}

export function useWallet() {
  return useContext(WalletContext)
}
