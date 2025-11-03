'use client';

import { TrendingUp, TrendingDown, Gift } from 'lucide-react';
import type { PointsTransaction } from '@/lib/supabase';
import { formatRelativeTime, formatPoints } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface TransactionListProps {
  transactions: PointsTransaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  const getIcon = (type: string) => {
    if (type === 'earned' || type === 'admin_credit') {
      return <TrendingUp size={20} className="text-green-500" />;
    }
    if (type === 'spent' || type === 'admin_debit') {
      return <TrendingDown size={20} className="text-red-500" />;
    }
    return <Gift size={20} className="text-blue-500" />;
  };

  return (
    <div className="space-y-3">
      <h3 className="heading-3 px-4">Transaction History</h3>
      
      {transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white dark:bg-gray-900 rounded-xl p-4 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  {getIcon(transaction.type)}
                </div>
                <div>
                  <p className="font-medium text-sm">{transaction.description}</p>
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(transaction.created_at)}
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  'font-bold',
                  transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {transaction.amount > 0 ? '+' : ''}{formatPoints(transaction.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}