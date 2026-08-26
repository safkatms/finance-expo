import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_queue';

type QueuedEntry = {
    type: 'sale' | 'payment' | 'return';
    amount: number;
    weekKey?: string;
    timestamp: number;
};

export async function enqueue(entry: Omit<QueuedEntry, 'timestamp'>) {
    const existing = await getQueue();
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, { ...entry, timestamp: Date.now() }]));
}

export async function getQueue(): Promise<QueuedEntry[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
}

export async function clearQueue() {
    await AsyncStorage.removeItem(QUEUE_KEY);
}

// offline-queue.ts

let isFlushing = false;

export async function flushQueue(api: any, onFlushed: () => void) {
    if (isFlushing) return;

    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    const queue = await getQueue();
    if (!queue.length) return;

    isFlushing = true;
    try {
        for (const entry of queue) {
            try {
                if (entry.type === 'sale') await api.post('/sales/sale', { amount: entry.amount });
                else if (entry.type === 'payment') await api.post('/sales/payment', { amount: entry.amount, weekKey: entry.weekKey });
                else await api.post('/sales/return', { amount: entry.amount, weekKey: entry.weekKey });
            } catch {
                return; // stop on first failure, queue stays intact
            }
        }
        await clearQueue();
        onFlushed();
    } finally {
        isFlushing = false;
    }
}