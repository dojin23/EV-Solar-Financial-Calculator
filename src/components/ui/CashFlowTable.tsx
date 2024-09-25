import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CashFlowTableProps {
  cashFlows: Array<{
    year: number;
    evRevenue: number;
    srecRevenue: number;
    utilityRebate: number;
    gridCost: number;
    maintenanceCost: number;
    loanPayment: number;
    profit: number;
    taxes: number;
    depreciation: number;
    cashFlow: number;
  }>;
  initialInvestment: number;
  financingType: string;
  revSharePercentage: number;
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatPercentage = (value: number) => 
  isNaN(value) ? 'N/A' : new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export function CashFlowTable({ cashFlows, initialInvestment, financingType, revSharePercentage }: CashFlowTableProps) {
  let cumulativeCashFlow = -initialInvestment;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Cash Flow Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <Table className="min-w-full divide-y divide-gray-300">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Year</TableHead>
                    <TableHead className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">EV Revenue</TableHead>
                    <TableHead className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Grid Cost</TableHead>
                    <TableHead className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Maintenance</TableHead>
                    <TableHead className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Loan Payment</TableHead>
                    <TableHead className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Profit</TableHead>
                    <TableHead className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Depreciation</TableHead>
                    <TableHead className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Taxes</TableHead>
                    <TableHead className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Cash Flow</TableHead>
                    <TableHead className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Cumulative CF</TableHead>
                    <TableHead className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashFlows.map((flow, index) => {
                    cumulativeCashFlow += flow.cashFlow;
                    const roi = cumulativeCashFlow > 0 ? (cumulativeCashFlow / initialInvestment) : -1;
                    return (
                      <TableRow key={flow.year}>
                        <TableCell className="py-4 pl-4 pr-3 text-sm sm:pl-6">{flow.year}</TableCell>
                        <TableCell className="px-3 py-4 text-sm text-right">{formatCurrency(flow.evRevenue)}</TableCell>
                        <TableCell className="px-3 py-4 text-sm text-right">{formatCurrency(flow.gridCost)}</TableCell>
                        <TableCell className="px-3 py-4 text-sm text-right">{formatCurrency(flow.maintenanceCost)}</TableCell>
                        <TableCell className="px-3 py-4 text-sm text-right">{formatCurrency(flow.loanPayment)}</TableCell>
                        <TableCell className="px-3 py-4 text-sm text-right">{formatCurrency(flow.profit)}</TableCell>
                        <TableCell className="px-3 py-4 text-sm text-right">{formatCurrency(flow.depreciation)}</TableCell>
                        <TableCell className="px-3 py-4 text-sm text-right">{formatCurrency(flow.taxes)}</TableCell>
                        <TableCell className="px-3 py-4 text-sm text-right">{formatCurrency(flow.cashFlow)}</TableCell>
                        <TableCell className="px-3 py-4 text-sm text-right">{formatCurrency(cumulativeCashFlow)}</TableCell>
                        <TableCell className="px-3 py-4 text-sm text-right">{formatPercentage(roi)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm">
          <p><strong>Notes:</strong></p>
          <ul className="list-disc list-inside">
            <li>All monetary values are in present value terms.</li>
            <li>Taxes are calculated at an assumed corporate tax rate of 21%.</li>
            <li>ROI is calculated as (Cumulative Cash Flow / Initial Investment) - 1.</li>
            <li>Depreciation follows the MACRS 5-year schedule for the first 6 years, then $0 thereafter.</li>
            {financingType === 'revshare' && (
              <li>Revenue Share: Property owner receives {revSharePercentage}% of EV charging revenue.</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
