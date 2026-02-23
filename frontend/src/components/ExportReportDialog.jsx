import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';

const getDateRange = (option, fromDate, toDate) => {
  const now = new Date();
  if (option === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }
  if (option === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start, end };
  }
  if (option === 'custom' && fromDate && toDate) {
    return {
      start: new Date(fromDate + 'T00:00:00'),
      end: new Date(toDate + 'T23:59:59'),
    };
  }
  return null;
};

const ExportReportDialog = ({
  open,
  onOpenChange,
  onExportCSV,
  onDownloadPDF,
  reportTitle = 'Report',
}) => {
  const [option, setOption] = useState('this_month');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const handleExportCSV = () => {
    const range = getDateRange(option, fromDate, toDate);
    if (range) {
      onExportCSV(range);
      onOpenChange(false);
    }
  };

  const handleDownloadPDF = () => {
    const range = getDateRange(option, fromDate, toDate);
    if (range) {
      onDownloadPDF(range);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export {reportTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Date Range</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateRange"
                  checked={option === 'this_month'}
                  onChange={() => setOption('this_month')}
                  className="text-primary"
                />
                <span>This Month</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateRange"
                  checked={option === 'last_month'}
                  onChange={() => setOption('last_month')}
                  className="text-primary"
                />
                <span>Last Month</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateRange"
                  checked={option === 'custom'}
                  onChange={() => setOption('custom')}
                  className="text-primary"
                />
                <span>Custom date range</span>
              </label>
            </div>
          </div>

          {option === 'custom' && (
            <div className="space-y-4 pl-6 border-l-2 border-primary/30">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  From Date
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  To Date
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleExportCSV} className="flex-1">
              Export CSV
            </Button>
            <Button onClick={handleDownloadPDF} className="flex-1">
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportReportDialog;
export { getDateRange };
