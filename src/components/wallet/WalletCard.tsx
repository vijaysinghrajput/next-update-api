'use client';

import { motion } from 'framer-motion';
import { Wallet, TrendingUp } from 'lucide-react';
import { formatPoints } from '@/utils/formatters';

interface WalletCardProps {
  pointsBalance: number;
  onBuyPoints: () => void;
}

export function WalletCard({ pointsBalance, onBuyPoints }: WalletCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={24} />
          <span className="text-sm font-medium opacity-90">Total Points</span>
        </div>
        <TrendingUp size={20} className="opacity-75" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <h2 className="text-4xl font-bold mb-1">{formatPoints(pointsBalance)}</h2>
        <p className="text-sm opacity-75">Available Points</p>
      </motion.div>

      <button
        onClick={onBuyPoints}
        className="w-full bg-white text-purple-600 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors"
      >
        Buy Points
      </button>
    </motion.div>
  );
}