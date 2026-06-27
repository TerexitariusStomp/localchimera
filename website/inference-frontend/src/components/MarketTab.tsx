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
  '0': 'pending', '1': 'acknowledged', '2': 'completed', '3': 'confirmed',
  '4': 'paid', '5': 'refunded', '6': 'disputed', '7': 'resolved',
};

const SESSION_STATUS: Record<string, string> = {
  '0': 'pending', '1': 'confirmed', '2': 'closed', '3': 'disputed', '4': 'resolved',
};

export default function MarketTab() {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<MarketTask[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const allTasks: MarketTask[] = [];

    try {
      // Inference jobs
      const imKeys = await getContractNamedKeys(CONTRACTS.inferenceMarket);
      const jobsUref = imKeys['im_jobs'];
      if (jobsUref) {
        for (let i = 0; i < 20; i++) {
          const id = `job-${i}`;
          const status = await queryDictionary(jobsUref, `${id}:status`);
          if (status === null || status === undefined) continue;
          const statusStr = JOB_STATUS[String(status)] || String(status);
          if (!['pending', 'acknowledged'].includes(statusStr)) continue;
          const amount = Number(await queryDictionary(jobsUref, `${id}:amount`) || '0');
          const maxTokens = String(await queryDictionary(jobsUref, `${id}:max_tokens`) || '0');
          allTasks.push({
            id, market: 'Inference', marketIcon: 'brain',
            amount, status: statusStr,
            details: `${maxTokens} max tokens`,
          });
        }
      }

      // Storage allocations
      const smKeys = await getContractNamedKeys(CONTRACTS.storageMarket);
      const allocsUref = smKeys['sm_allocations'];
      if (allocsUref) {
        for (let i = 0; i < 20; i++) {
          const id = `alloc-${i}`;
          const status = await queryDictionary(allocsUref, `${id}:status`);
          if (status === null || status === undefined) continue;
          if (String(status) !== '0') continue;
          const amount = Number(await queryDictionary(allocsUref, `${id}:amount`) || '0');
          const sizeMb = String(await queryDictionary(allocsUref, `${id}:size`) || '0');
          allTasks.push({
            id, market: 'Storage', marketIcon: 'harddrive',
            amount, status: 'open',
            details: `${sizeMb} MB`,
          });
        }
      }

      // Compute demands
      const cmKeys = await getContractNamedKeys(CONTRACTS.computeMarket);
      const demandsUref = cmKeys['cm_demands'];
      if (demandsUref) {
        for (let i = 0; i < 20; i++) {
          const id = `demand-${i}`;
          const status = await queryDictionary(demandsUref, `${id}:status`);
          if (status === null || status === undefined) continue;
          if (String(status) !== '0') continue;
          const maxCost = Number(await queryDictionary(demandsUref, `${id}:max_cost`) || '0');
          const taskType = String(await queryDictionary(demandsUref, `${id}:task_type`) || '');
          const gpu = Boolean(await queryDictionary(demandsUref, `${id}:gpu`));
          allTasks.push({
            id, market: 'Compute', marketIcon: 'cpu',
            amount: maxCost, status: 'open',
            details: `${taskType}${gpu ? ' · GPU' : ''}`,
          });
        }
      }

      // Bandwidth sessions
      const bmKeys = await getContractNamedKeys(CONTRACTS.bandwidthMarket);
      const sessionsUref = bmKeys['bm_sessions'];
      if (sessionsUref) {
        for (let i = 0; i < 20; i++) {
          const id = `session-${i}`;
          const status = await queryDictionary(sessionsUref, `${id}:status`);
          if (status === null || status === undefined) continue;
          const statusStr = SESSION_STATUS[String(status)] || String(status);
          if (!['pending'].includes(statusStr)) continue;
          const amount = Number(await queryDictionary(sessionsUref, `${id}:amount`) || '0');
          const maxDuration = String(await queryDictionary(sessionsUref, `${id}:max_duration`) || '0');
          const maxData = String(await queryDictionary(sessionsUref, `${id}:max_data`) || '0');
          allTasks.push({
            id, market: 'Bandwidth', marketIcon: 'wifi',
            amount, status: statusStr,
            details: `${maxDuration}s · ${maxData} MB`,
          });
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
