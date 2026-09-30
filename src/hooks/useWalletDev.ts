import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface Wallet {
    id: string;
    user_id: string;
    balance: number;
    created_at: string;
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    wallet_id: string;
    user_id: string;
    amount: number;
    type: "credit" | "debit";
    description: string | null;
    reference_id: string | null;
    created_at: string;
}

// Development mode wallet hook
export function useWalletDev() {
    const { user } = useAuth();
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) {
            setIsLoading(false);
            return;
        }

        // Get or create wallet from localStorage
        const walletsKey = 'dev_wallets';
        const walletsData = localStorage.getItem(walletsKey);
        const wallets = walletsData ? JSON.parse(walletsData) : {};

        if (!wallets[user.id]) {
            // Create new wallet with initial balance
            wallets[user.id] = {
                id: `wallet_${user.id}`,
                user_id: user.id,
                balance: 1000, // Initial balance ₹1000
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            localStorage.setItem(walletsKey, JSON.stringify(wallets));
        }

        setWallet(wallets[user.id]);
        setIsLoading(false);
    }, [user?.id]);

    return {
        data: wallet,
        isLoading,
        error: null,
    };
}

// Development mode transactions hook
export function useWalletTransactionsDev(limit = 10) {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) {
            setIsLoading(false);
            return;
        }

        // Get transactions from localStorage
        const txKey = 'dev_wallet_transactions';
        const txData = localStorage.getItem(txKey);
        const allTransactions = txData ? JSON.parse(txData) : [];

        // Filter by user and limit
        const userTransactions = allTransactions
            .filter((tx: WalletTransaction) => tx.user_id === user.id)
            .sort((a: WalletTransaction, b: WalletTransaction) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            .slice(0, limit);

        setTransactions(userTransactions);
        setIsLoading(false);
    }, [user?.id, limit]);

    return {
        data: transactions,
        isLoading,
        error: null,
    };
}

// Helper function to add money to wallet
export function addMoneyToWallet(userId: string, amount: number, description: string = "Wallet Recharge") {
    // Update wallet balance
    const walletsKey = 'dev_wallets';
    const walletsData = localStorage.getItem(walletsKey);
    const wallets = walletsData ? JSON.parse(walletsData) : {};

    if (wallets[userId]) {
        wallets[userId].balance += amount;
        wallets[userId].updated_at = new Date().toISOString();
        localStorage.setItem(walletsKey, JSON.stringify(wallets));
    }

    // Add transaction
    const txKey = 'dev_wallet_transactions';
    const txData = localStorage.getItem(txKey);
    const transactions = txData ? JSON.parse(txData) : [];

    const newTransaction: WalletTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        wallet_id: `wallet_${userId}`,
        user_id: userId,
        amount: amount,
        type: "credit",
        description: description,
        reference_id: `ref_${Date.now()}`,
        created_at: new Date().toISOString(),
    };

    transactions.push(newTransaction);
    localStorage.setItem(txKey, JSON.stringify(transactions));

    // Trigger storage event for real-time updates
    window.dispatchEvent(new Event('storage'));

    return newTransaction;
}

// Helper function to deduct money from wallet
export function deductMoneyFromWallet(userId: string, amount: number, description: string = "Payment") {
    // Update wallet balance
    const walletsKey = 'dev_wallets';
    const walletsData = localStorage.getItem(walletsKey);
    const wallets = walletsData ? JSON.parse(walletsData) : {};

    if (wallets[userId]) {
        if (wallets[userId].balance < amount) {
            throw new Error("Insufficient balance");
        }

        wallets[userId].balance -= amount;
        wallets[userId].updated_at = new Date().toISOString();
        localStorage.setItem(walletsKey, JSON.stringify(wallets));
    }

    // Add transaction
    const txKey = 'dev_wallet_transactions';
    const txData = localStorage.getItem(txKey);
    const transactions = txData ? JSON.parse(txData) : [];

    const newTransaction: WalletTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        wallet_id: `wallet_${userId}`,
        user_id: userId,
        amount: amount,
        type: "debit",
        description: description,
        reference_id: `ref_${Date.now()}`,
        created_at: new Date().toISOString(),
    };

    transactions.push(newTransaction);
    localStorage.setItem(txKey, JSON.stringify(transactions));

    // Trigger storage event for real-time updates
    window.dispatchEvent(new Event('storage'));

    return newTransaction;
}

// Initialize with some sample transactions
export function initializeSampleTransactions(userId: string) {
    const txKey = 'dev_wallet_transactions';
    const txData = localStorage.getItem(txKey);
    const transactions = txData ? JSON.parse(txData) : [];

    // Check if user already has transactions
    const userHasTransactions = transactions.some((tx: WalletTransaction) => tx.user_id === userId);

    if (!userHasTransactions) {
        // Add sample transactions
        const sampleTransactions: WalletTransaction[] = [
            {
                id: `tx_sample_1_${userId}`,
                wallet_id: `wallet_${userId}`,
                user_id: userId,
                amount: 1000,
                type: "credit",
                description: "Initial wallet credit",
                reference_id: "ref_initial",
                created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
            },
            {
                id: `tx_sample_2_${userId}`,
                wallet_id: `wallet_${userId}`,
                user_id: userId,
                amount: 150,
                type: "debit",
                description: "Milk delivery payment",
                reference_id: "ref_delivery_1",
                created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
            },
            {
                id: `tx_sample_3_${userId}`,
                wallet_id: `wallet_${userId}`,
                user_id: userId,
                amount: 500,
                type: "credit",
                description: "Wallet recharge",
                reference_id: "ref_recharge_1",
                created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            },
            {
                id: `tx_sample_4_${userId}`,
                wallet_id: `wallet_${userId}`,
                user_id: userId,
                amount: 200,
                type: "debit",
                description: "Subscription payment",
                reference_id: "ref_subscription_1",
                created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            },
        ];

        transactions.push(...sampleTransactions);
        localStorage.setItem(txKey, JSON.stringify(transactions));
    }
}
