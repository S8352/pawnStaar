import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Transaction {
    id: number;
    amount: number;
    description: string;
    created_at: string;
}

interface BalanceResponse {
    balance: number;
}

// This is a placeholder for the actual API call
const fetchBalance = async (token: string): Promise<BalanceResponse> => {
    return { balance: 4850 }; // Mock balance
};

const fetchHistory = async (token: string): Promise<Transaction[]> => {
    return [
        { id: 1, amount: -100, description: 'Stake for game vs. opponent123', created_at: new Date().toISOString() },
        { id: 2, amount: 200, description: 'Win from game vs. opponent456', created_at: new Date().toISOString() },
        { id: 3, amount: 150, description: 'Daily workout completed', created_at: new Date().toISOString() },
        { id: 4, amount: 100, description: 'Completed lesson: The Queen\'s Gambit', created_at: new Date().toISOString() },
    ];
};


export function WalletDisplay() {
    const [balance, setBalance] = useState<number | null>(null);
    const [history, setHistory] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadWalletData = async () => {
            setLoading(true);
            const token = "dummy-token"; // Placeholder for auth token
            
            try {
                const balanceRes = await fetchBalance(token);
                const historyRes = await fetchHistory(token);
                setBalance(balanceRes.balance);
                setHistory(historyRes);
            } catch (error) {
                console.error("Failed to load wallet data", error);
            } finally {
                setLoading(false);
            }
        };

        loadWalletData();
    }, []);

    if (loading) {
        return <div>Loading Wallet...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Wallet</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold mb-4">
                    {balance !== null ? `${balance} Coins` : 'N/A'}
                </div>
                <Tabs defaultValue="history">
                    <TabsList>
                        <TabsTrigger value="history">Transaction History</TabsTrigger>
                    </TabsList>
                    <TabsContent value="history">
                        <ScrollArea className="h-60">
                            <ul>
                                {history.map((item) => (
                                    <li key={item.id} className="border-b py-2 flex justify-between">
                                        <span>{item.description}</span>
                                        <span className={item.amount > 0 ? 'text-success' : 'text-destructive'}>
                                            {item.amount > 0 ? '+' : ''}{item.amount}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
