import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const KpiCard = ({ title, value, icon: Icon, trend, trendUp }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
    
    if (isNaN(numericValue)) {
      setDisplayValue(value);
      return;
    }

    let start = 0;
    const duration = 1000;
    const increment = numericValue / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= numericValue) {
        setDisplayValue(typeof value === 'string' ? value : Math.round(numericValue));
        clearInterval(timer);
      } else {
        setDisplayValue(typeof value === 'string' ? `$${Math.round(start).toLocaleString()}` : Math.round(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(255, 106, 0, 0.2)' }}
      transition={{ duration: 0.2 }}
      className="bg-card rounded-lg p-4 sm:p-6 border border-secondary min-w-0"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs sm:text-sm ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
            {trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-xl sm:text-2xl font-bold mb-1 truncate">{displayValue}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{title}</p>
    </motion.div>
  );
};

export default KpiCard;