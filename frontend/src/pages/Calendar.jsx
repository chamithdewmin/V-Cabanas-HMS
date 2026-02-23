import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, DollarSign, Receipt, FileText, TrendingUp } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Calendar = () => {
  const { incomes, expenses, invoices, settings, loadData } = useFinance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const currency = settings?.currency || 'LKR';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Format any date (Date or string from API) as local YYYY-MM-DD so calendar matches DB dates correctly
  const toLocalDateString = (val) => {
    if (val == null) return '';
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Get transactions for a specific date (compare local dates so timezone doesn't shift the day)
  const getTransactionsForDate = (date) => {
    const dateStr = toLocalDateString(date);
    if (!dateStr) return { incomes: [], expenses: [], invoices: [] };
    const dayTransactions = {
      incomes: [],
      expenses: [],
      invoices: [],
    };

    incomes.forEach(income => {
      if (toLocalDateString(income.date) === dateStr) {
        dayTransactions.incomes.push(income);
      }
    });

    expenses.forEach(expense => {
      if (toLocalDateString(expense.date) === dateStr) {
        dayTransactions.expenses.push(expense);
      }
    });

    invoices.forEach(invoice => {
      const invDate = invoice.dueDate ?? invoice.createdAt;
      if (invDate && toLocalDateString(invDate) === dateStr) {
        dayTransactions.invoices.push(invoice);
      }
    });

    return dayTransactions;
  };

  // Calculate totals for a date
  const getDateTotals = (date) => {
    const transactions = getTransactionsForDate(date);
    const incomeTotal = transactions.incomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    const expenseTotal = transactions.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const invoiceTotal = transactions.invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    return { incomeTotal, expenseTotal, invoiceTotal, net: incomeTotal - expenseTotal };
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(year, month + direction, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const calendarDays = useMemo(() => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push(date);
    }

    return days;
  }, [year, month, startingDayOfWeek, daysInMonth]);

  const [selectedDate, setSelectedDate] = useState(null);
  const selectedTransactions = selectedDate ? getTransactionsForDate(selectedDate) : null;
  const selectedTotals = selectedDate ? getDateTotals(selectedDate) : null;

  useEffect(() => {
    loadData?.();
  }, []);

  return (
    <>
      <Helmet>
        <title>Calendar - MyAccounts</title>
        <meta name="description" content="View your financial transactions in a calendar view" />
      </Helmet>

      <div className="space-y-4 sm:space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 flex-wrap">
              <CalendarIcon className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
              Calendar
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              View your income, expenses, and invoices by date
            </p>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="bg-card rounded-lg border border-secondary p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(-1)}
                className="h-9 w-9 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-bold">
                {monthNames[month]} {year}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(1)}
                className="h-9 w-9 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Today
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const totals = getDateTotals(date);
              const hasTransactions = totals.incomeTotal > 0 || totals.expenseTotal > 0 || totals.invoiceTotal > 0;
              const isSelected = selectedDate && 
                date.getDate() === selectedDate.getDate() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getFullYear() === selectedDate.getFullYear();

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "aspect-square p-1 sm:p-2 rounded-lg border transition-all text-left",
                    "hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary",
                    isToday(date) && "border-primary border-2",
                    isSelected && "bg-primary/10 border-primary",
                    !hasTransactions && "border-transparent"
                  )}
                >
                  <div className="flex flex-col h-full">
                    <span className={cn(
                      "text-sm font-semibold mb-1",
                      isToday(date) ? "text-primary" : "text-foreground"
                    )}>
                      {date.getDate()}
                    </span>
                    {hasTransactions && (
                      <div className="flex flex-col gap-0.5 text-xs">
                        {totals.incomeTotal > 0 && (
                          <div className="text-green-500 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span className="truncate">{totals.incomeTotal.toLocaleString()}</span>
                          </div>
                        )}
                        {totals.expenseTotal > 0 && (
                          <div className="text-red-500 flex items-center gap-1">
                            <Receipt className="w-3 h-3" />
                            <span className="truncate">{totals.expenseTotal.toLocaleString()}</span>
                          </div>
                        )}
                        {totals.invoiceTotal > 0 && (
                          <div className="text-yellow-500 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span className="truncate">{totals.invoiceTotal.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && selectedTransactions && (
          <div className="bg-card rounded-lg border border-secondary p-4 sm:p-6">
            <h3 className="text-lg font-bold mb-4">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>

            {selectedTotals && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Income</p>
                  <p className="text-lg font-bold text-green-500">
                    {currency} {selectedTotals.incomeTotal.toLocaleString()}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                  <p className="text-lg font-bold text-red-500">
                    {currency} {selectedTotals.expenseTotal.toLocaleString()}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Pending Invoices</p>
                  <p className="text-lg font-bold text-yellow-500">
                    {currency} {selectedTotals.invoiceTotal.toLocaleString()}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Net</p>
                  <p className={cn(
                    "text-lg font-bold",
                    selectedTotals.net >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {currency} {selectedTotals.net.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Incomes */}
              {selectedTransactions.incomes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-500 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Income ({selectedTransactions.incomes.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTransactions.incomes.map((income) => (
                      <div
                        key={income.id}
                        className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{income.clientName || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{income.serviceType || 'Income'}</p>
                        </div>
                        <p className="font-bold text-green-500">
                          {currency} {(income.amount || 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses */}
              {selectedTransactions.expenses.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Expenses ({selectedTransactions.expenses.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTransactions.expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{expense.category || 'Expense'}</p>
                          <p className="text-sm text-muted-foreground">{expense.notes || 'No notes'}</p>
                        </div>
                        <p className="font-bold text-red-500">
                          {currency} {(expense.amount || 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {selectedTransactions.invoices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-yellow-500 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Invoices ({selectedTransactions.invoices.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTransactions.invoices.map((invoice) => (
                      <div
                        key={invoice.id || invoice.invoiceNumber}
                        className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{invoice.clientName || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            Invoice #{invoice.invoiceNumber || invoice.id} • {invoice.status}
                          </p>
                        </div>
                        <p className="font-bold text-yellow-500">
                          {currency} {(invoice.total || 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTransactions.incomes.length === 0 &&
                selectedTransactions.expenses.length === 0 &&
                selectedTransactions.invoices.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No transactions on this date
                  </p>
                )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Calendar;
