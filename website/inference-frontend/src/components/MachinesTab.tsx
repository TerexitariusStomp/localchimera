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
      // Query compute registry for all registered providers and their resource capacities
      const crKeys = await getContractNamedKeys(CONTRACTS.computeRegistry);
      const providersListUref = crKeys['providers_list'];
      const providersNameUref = crKeys['providers_name'];
      const providersStatusUref = crKeys['providers_status'];
      const providersGpuUref = crKeys['providers_gpu'];
      const providersVramUref = crKeys['providers_vram'];
      const providersCpuUref = crKeys['providers_cpu_cores'];
      const providersRamUref = crKeys['providers_ram'];
      const providersModelsUref = crKeys['providers_models'];
      const providersCapacityUref = crKeys['providers_total_capacity_mb'];
      const providersBandwidthUref = crKeys['providers_bandwidth_mbps'];
      const providersServiceUref = crKeys['providers_service_type'];
      const stakesUref = crKeys['stakes'];
      if (providersListUref) {
        const list = await queryDictionary(providersListUref, 'list');
        const providerHashes: string[] = Array.isArray(list) ? list as string[] : [];
        for (const ph of providerHashes) {
          try {
            const status = await queryDictionary(providersStatusUref, ph);
            if (status === null || status === undefined) continue;
            const name = String(await queryDictionary(providersNameUref, ph) || 'Unknown');
            const gpu = await queryDictionary(providersGpuUref, ph);
            const vram = String(await queryDictionary(providersVramUref, ph) || '0');
            const cpu = String(await queryDictionary(providersCpuUref, ph) || '0');
            const ram = String(await queryDictionary(providersRamUref, ph) || '0');
            const models = String(await queryDictionary(providersModelsUref, ph) || '');
            const capacity = String(await queryDictionary(providersCapacityUref, ph) || '0');
            const bandwidth = String(await queryDictionary(providersBandwidthUref, ph) || '0');
            const serviceType = String(await queryDictionary(providersServiceUref, ph) || '');
            const stake = String(await queryDictionary(stakesUref, ph) || '0');
            const stakeCSPR = (Number(stake) / 1e9).toFixed(2);
            const isActive = String(status) === '1';

            // Build specs string showing all resource capabilities
            const specsParts: string[] = [];
            if (models) specsParts.push(`Models: ${models.slice(0, 30)}`);
            if (cpu !== '0') specsParts.push(`CPU: ${cpu} cores`);
            if (ram !== '0') specsParts.push(`RAM: ${ram}MB`);
            if (capacity !== '0') specsParts.push(`Storage: ${capacity}MB`);
            if (bandwidth !== '0') specsParts.push(`Bandwidth: ${bandwidth}Mbps`);
            specsParts.push(`GPU: ${Boolean(gpu)}`);
            if (vram !== '0') specsParts.push(`VRAM: ${vram}MB`);
            const specs = specsParts.join(' · ');

            all.push({
              market: 'All Resources', marketIcon: 'server',
              address: ph.slice(0, 20) + '...',
              name,
              status: isActive ? 'active' : 'paused',
              specs,
              stake: stakeCSPR + ' CSPR',
            });
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
    if (icon === 'server') return <Server className={cls} />;
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
