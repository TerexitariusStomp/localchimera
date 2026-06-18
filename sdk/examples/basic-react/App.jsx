import React from 'react';
import MiningPanel from './MiningPanel';

/**
 * Example app integrating the Chimera SDK.
 * Replace the integratorWallet with your own EVM address.
 */
export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#030308',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }}>
      <MiningPanel
        integratorWallet="0xYourEvmWalletAddressHere"
        revenueSplit={{ integrator: 0.30, machineOwner: 0.70 }}
      />
    </div>
  );
}
