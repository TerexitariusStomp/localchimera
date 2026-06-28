import { useState, useEffect, useCallback } from 'react';
import { Card, Badge } from './ui';
import { RefreshCw, Brain, HardDrive, Cpu, Wifi, TrendingUp } from 'lucide-react';
import { CONTRACTS, getContractNamedKeys, queryDictionary } from '../casper-client';

interface MarketTask {
  id: string;
  market: string;
  marketIcon: string;
  amount: number;
  status: string;
  details: string;
}

const JOB_STATUS: Record<string, string> = {
  '0': 'pending', '1': 'assigned', '2': 'completed', '3': 'confirmed',
  '4': 'paid', '5': 'refunded', '6': 'disputed', '7': 'resolved',
};

export default function MarketTab() {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<MarketTask[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const allTasks: MarketTask[] = [];

    try {
      // Query escrow vault for all pending jobs — categorize by request_hash prefix
      const evKeys = await getContractNamedKeys(CONTRACTS.escrowVault);
      const jobsUref = evKeys['jobs_dict'];
      const pendingUref = evKeys['pending_jobs'];
      if (jobsUref && pendingUref) {
        const pendingList = await queryDictionary(pendingUref, 'list');
        const jobIds: string[] = Array.isArray(pendingList) ? pendingList as string[] : [];
        for (const id of jobIds) {
          const state = await queryDictionary(jobsUref, `${id}:state`);
          if (state === null || state === undefined) continue;
          const stateNum = Number(state);
          // Show pending (0) and assigned (1) jobs
          if (stateNum > 1) continue;
          const statusStr = JOB_STATUS[String(stateNum)] || String(stateNum);
          const amount = Number(await queryDictionary(jobsUref, `${id}:amount`) || '0');
          const requestHash = String(await queryDictionary(jobsUref, `${id}:request_hash`) || '');

          let market = 'Inference', marketIcon = 'brain', details = requestHash.slice(0, 40) || id;
          if (requestHash.startsWith('STORAGE:')) {
            market = 'Storage'; marketIcon = 'harddrive';
            details = requestHash.slice(0, 40);
          } else if (requestHash.startsWith('COMPUTE:')) {
            market = 'Compute'; marketIcon = 'cpu';
            details = requestHash.slice(0, 40);
          } else if (requestHash.startsWith('BANDWIDTH:')) {
            market = 'Bandwidth'; marketIcon = 'wifi';
            details = requestHash.slice(0, 40);
          }

          allTasks.push({ id, market, marketIcon, amount, status: statusStr, details });
        }
      }
    } catch (e) {
      console.error('Failed to load market tasks:', e);
    } finally {
      setLoading(false);
    }

    allTasks.sort((a, b) => b.amount - a.amount);
    setTasks(allTasks);
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
          <h2 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-[#00e5ff]" />Open Market</h2>
          <p className="text-muted-foreground text-sm">All open tasks across every market, sorted by highest payment first.</p>
        </div>
        <button onClick={loadData} disabled={loading} className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <Card className="p-4">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No open tasks. New tasks appear here automatically.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {tasks.map((t) => (
              <div key={`${t.market}-${t.id}`} className="flex items-center justify-between text-xs bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-[#00e5ff]">{iconFor(t.marketIcon)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{t.market}</Badge>
                      <span className="font-mono text-[#7a7468]">{t.id}</span>
                    </div>
                    <div className="text-[#7a7468] mt-0.5">{t.details}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={t.status === 'open' ? 'warning' : 'default'}>{t.status}</Badge>
                  <span className="font-semibold text-[#00e5ff]">{(t.amount / 1e9).toFixed(4)} CSPR</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
