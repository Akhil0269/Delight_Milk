import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useWallet, useWalletTransactions } from "@/hooks/useWallet";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import AddMoneyDialog from "./AddMoneyDialog";

const WalletCard = () => {
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: transactions, isLoading: transactionsLoading } = useWalletTransactions(5);

  const [showAddMoney, setShowAddMoney] = useState(false);
  const balance = wallet?.balance || 0;
  const [displayBalance, setDisplayBalance] = useState(0);
  const showLowBalanceAlert = balance < 500 && balance >= 0;

  // Animate balance count up
  useEffect(() => {
    if (walletLoading) return;

    const duration = 1500;
    const steps = 60;
    const increment = balance / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= balance) {
        setDisplayBalance(balance);
        clearInterval(timer);
      } else {
        setDisplayBalance(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [balance, walletLoading]);

  if (walletLoading) {
    return (
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6">
        <Skeleton className="h-12 w-full mb-4 bg-white/20" />
        <Skeleton className="h-16 w-32 mb-4 bg-white/20" />
        <Skeleton className="h-20 w-full bg-white/20" />
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Wallet Balance</h3>
              <p className="text-sm text-white/70">Available funds</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={() => setShowAddMoney(true)}
          >
            <Plus className="w-4 h-4" />
            Add Money
          </Button>
        </div>

        {/* Balance */}
        <motion.div
          className="text-4xl md:text-5xl font-bold mb-6"
          key={displayBalance}
        >
          ₹{displayBalance.toLocaleString()}
        </motion.div>

        {/* Low Balance Alert */}
        <AnimatePresence>
          {showLowBalanceAlert && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 p-3 bg-warning/20 rounded-lg mb-4"
            >
              <Bell className="w-5 h-5 text-warning" />
              <span className="text-sm">Low balance! Add money to continue deliveries.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Transactions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/70">Recent Activity</h4>
          {transactionsLoading ? (
            <Skeleton className="h-16 w-full bg-white/20" />
          ) : transactions && transactions.length > 0 ? (
            transactions.slice(0, 3).map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between py-2 border-t border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${tx.type === "credit" ? "bg-accent" : "bg-white/20"} flex items-center justify-center`}>
                    {tx.type === "credit" ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{tx.description || (tx.type === "credit" ? "Wallet Recharge" : "Bill Payment")}</div>
                    <div className="text-xs text-white/60">{format(new Date(tx.created_at), "MMM d")}</div>
                  </div>
                </div>
                <span className={`font-semibold ${tx.type === "credit" ? "text-accent" : ""}`}>
                  {tx.type === "credit" ? "+" : "-"}₹{Math.abs(tx.amount)}
                </span>
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-white/60 py-2">No transactions yet</p>
          )}
        </div>
      </motion.div>

      {/* Add Money Dialog */}
      <AddMoneyDialog open={showAddMoney} onOpenChange={setShowAddMoney} />
    </>
  );
};

export default WalletCard;

