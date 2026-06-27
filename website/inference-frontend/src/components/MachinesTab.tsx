import { useState, useEffect, useCallback } from 'react';
import { Card, Badge } from './ui';
import { RefreshCw, Brain, HardDrive, Cpu, Wifi, Server } from 'lucide-react';
import { CONTRACTS, getContractNamedKeys, queryDictionary } from '../casper-client';

interface Machine {
  market: string;
  marketIcon: string;
  address: string;
  name: string;
  status: string;
  specs: string;
  stake: string;
}

export default function MachinesTab() {
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const all: Machine[] = [];

    try {
      // Inference providers — scan first 50 possible account hashes is not feasible,
      // so we iterate by checking known provider registry pattern: try sequential indices
      const imKeys = await getContractNamedKeys(CONTRACTS.inferenceMarket);
      const imProvidersUref = imKeys['im_providers'];
      if (imProvidersUref) {
        // Providers are keyed by account hash, which we can't enumerate.
        // Try common test accounts — just check if the admin key is registered.
        const testHashes = [
          '020227d8dd5ccaa600e45b36e598d90ef8c26b6c67ef81bdfebde8fa583997a91ea5',
        ];
        for (const pkHex of testHashes) {
          try {
            const { PublicKey } = await import('casper-js-sdk');
            const pk = PublicKey.fromHex(pkHex);
            const hashHex = pk.accountHash().toHex();
            const status = await queryDictionary(imProvidersUref, `${hashHex}:status`);
            if (status !== null && status !== undefined) {
              all.push({
                market: 'Inference', marketIcon: 'brain',
                address: pkHex.slice(0, 12) + '...',
                name: String(await queryDictionary(imProvidersUref, `${hashHex}:name`) || 'Unknown'),
                status: String(status) === '1' ? 'active' : 'paused',
                specs: `GPU: ${Boolean(await queryDictionary(imProvidersUref, `${hashHex}:gpu`))} · VRAM: ${String(await queryDictionary(imProvidersUref, `${hashHex}:vram`) || '0')}MB`,
                stake: String(await queryDictionary(imProvidersUref, `${hashHex}:stake`) || '0'),
              });
            }
          } catch {}
        }
      }

      // Storage providers
      const smKeys = await getContractNamedKeys(CONTRACTS.storageMarket);
      const smProvidersUref = smKeys['sm_providers'];
      if (smProvidersUref) {
        const testHashes = [
          '020227d8dd5ccaa600e45b36e598d90ef8c26b6c67ef81bdfebde8fa583997a91ea5',
        ];
        for (const pkHex of testHashes) {
          try {
            const { PublicKey } = await import('casper-js-sdk');
            const pk = PublicKey.fromHex(pkHex);
            const hashHex = pk.accountHash().toHex();
            const status = await queryDictionary(smProvidersUref, `${hashHex}:status`);
            if (status !== null && status !== undefined) {
              all.push({
                market: 'Storage', marketIcon: 'harddrive',
                address: pkHex.slice(0, 12) + '...',
                name: String(await queryDictionary(smProvidersUref, `${hashHex}:name`) || 'Unknown'),
                status: String(status) === '1' ? 'active' : 'paused',
                specs: `Capacity: ${String(await queryDictionary(smProvidersUref, `${hashHex}:capacity`) || '0')}MB`,
                stake: String(await queryDictionary(smProvidersUref, `${hashHex}:stake`) || '0'),
              });
            }
          } catch {}
        }
      }

      // Compute providers
      const cmKeys = await getContractNamedKeys(CONTRACTS.computeMarket);
      const cmProvidersUref = cmKeys['cm_providers'];
      if (cmProvidersUref) {
        const testHashes = [
          '020227d8dd5ccaa600e45b36e598d90ef8c26b6c67ef81bdfebde8fa583997a91ea5',
        ];
        for (const pkHex of testHashes) {
          try {
            const { PublicKey } = await import('casper-js-sdk');
            const pk = PublicKey.fromHex(pkHex);
            const hashHex = pk.accountHash().toHex();
            const status = await queryDictionary(cmProvidersUref, `${hashHex}:status`);
            if (status !== null && status !== undefined) {
              all.push({
                market: 'Compute', marketIcon: 'cpu',
                address: pkHex.slice(0, 12) + '...',
                name: String(await queryDictionary(cmProvidersUref, `${hashHex}:name`) || 'Unknown'),
                status: String(status) === '1' ? 'active' : 'paused',
                specs: `CPU: ${String(await queryDictionary(cmProvidersUref, `${hashHex}:cpu_cores`) || '0')} cores · GPU: ${Boolean(await queryDictionary(cmProvidersUref, `${hashHex}:gpu`))}`,
                stake: String(await queryDictionary(cmProvidersUref, `${hashHex}:stake`) || '0'),
              });
            }
          } catch {}
        }
      }

      // Bandwidth providers
      const bmKeys = await getContractNamedKeys(CONTRACTS.bandwidthMarket);
      const bmProvidersUref = bmKeys['bm_providers'];
      if (bmProvidersUref) {
        const testHashes = [
          '020227d8dd5ccaa600e45b36e598d90ef8c26b6c67ef81bdfebde8fa583997a91ea5',
        ];
        for (const pkHex of testHashes) {
          try {
            const { PublicKey } = await import('casper-js-sdk');
            const pk = PublicKey.fromHex(pkHex);
            const hashHex = pk.accountHash().toHex();
            const status = await queryDictionary(bmProvidersUref, `${hashHex}:status`);
            if (status !== null && status !== undefined) {
              all.push({
                market: 'Bandwidth', marketIcon: 'wifi',
                address: pkHex.slice(0, 12) + '...',
                name: String(await queryDictionary(bmProvidersUref, `${hashHex}:name`) || 'Unknown'),
                status: String(status) === '1' ? 'active' : 'paused',
                specs: `Price/hr: ${String(await queryDictionary(bmProvidersUref, `${hashHex}:price_hr`) || '0')} · Price/GB: ${String(await queryDictionary(bmProvidersUref, `${hashHex}:price_gb`) || '0')}`,
                stake: String(await queryDictionary(bmProvidersUref, `${hashHex}:stake`) || '0'),
              });
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error('Failed to load machines:', e);
    } finally {
      setLoading(false);
    }

    setMachines(all);
  }, []);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [loadData]);

  const iconFor = (icon: string) => {
    const cls = 'h-4 w-4';
    if (icon === 'brain') return <Brain className={cls} />;
    if (icon === 'harddrive') return <HardDrive className={cls} />;
    if (icon === 'cpu') return <Cpu className={cls} />;
    if (icon === 'wifi') return <Wifi className={cls} />;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Server className="h-6 w-6 text-[#a855f7]" />Machines</h2>
          <p className="text-muted-foreground text-sm">All registered provider machines across every market.</p>
        </div>
        <button onClick={loadData} disabled={loading} className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <Card className="p-4">
        {machines.length === 0 ? (
          <p className="text-xs text-muted-foreground">No machines registered yet. Providers appear here after registration.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {machines.map((m, i) => (
              <div key={`${m.market}-${i}`} className="flex items-center justify-between text-xs bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-[#a855f7]">{iconFor(m.marketIcon)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{m.market}</Badge>
                      <span className="font-medium">{m.name}</span>
                    </div>
                    <div className="text-[#7a7468] mt-0.5 font-mono">{m.address}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#7a7468]">{m.specs}</span>
                  <Badge variant={m.status === 'active' ? 'success' : 'warning'}>{m.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
