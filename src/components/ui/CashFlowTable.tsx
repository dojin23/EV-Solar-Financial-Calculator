import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CashFlowTableProps {
  cashFlows: Array<{
    year: number;
    evRevenue: number;
    solarSavings: number;
    srecRevenue: number;
    gridCost: number;
    maintenanceCost: number;
    profit: number;
    taxes: number;
    cashFlow: number;
  }>;
  initialInvestment: number;
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatPercentage = (value: number) => 
  isNaN(value) ? 'N/A' : new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export function CashFlowTable({ cashFlows, initialInvestment }: CashFlowTableProps) {
  const totalCashFlow = cashFlows.reduce((sum, flow) => sum + flow.cashFlow, 0);
  const averageAnnualCashFlow = totalCashFlow / cashFlows.length;
  const roi = initialInvestment !== 0 ? totalCashFlow / initialInvestment : 0;

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gray-100">
        <CardTitle className="text-xl font-bold">Cash Flow Details</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Initial Investment:</strong> {formatCurrency(initialInvestment)}</p>
            <p><strong>Project Lifespan:</strong> {cashFlows.length} years</p>
          </div>
          <div>
            <p><strong>Total Cash Flow:</strong> {formatCurrency(totalCashFlow)}</p>
            <p><strong>Average Annual Cash Flow:</strong> {formatCurrency(averageAnnualCashFlow)}</p>
            <p><strong>Return on Investment:</strong> {formatPercentage(roi)}</p>
          </div>
        </div>
        <div className="overflow-x-auto mt-4 border rounded-lg">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left px-2 py-3">Year</TableHead>
                <TableHead className="text-right px-2 py-3">EV Revenue</TableHead>
                <TableHead className="text-right px-2 py-3">Solar Savings</TableHead>
                <TableHead className="text-right px-2 py-3">SREC Revenue</TableHead>
                <TableHead className="text-right px-2 py-3">Grid Cost</TableHead>
                <TableHead className="text-right px-2 py-3">Maintenance</TableHead>
                <TableHead className="text-right px-2 py-3">Profit</TableHead>
                <TableHead className="text-right px-2 py-3">Taxes</TableHead>
                <TableHead className="text-right px-2 py-3">Cash Flow</TableHead>
                <TableHead className="text-right px-2 py-3">Cumulative CF</TableHead>
                <TableHead className="text-right px-2 py-3">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashFlows.map((flow, index) => {
                const cumulativeCashFlow = cashFlows.slice(0, index + 1).reduce((sum, f) => sum + f.cashFlow, 0) - initialInvestment;
                const yearlyRoi = initialInvestment !== 0 ? (cumulativeCashFlow + initialInvestment) / initialInvestment - 1 : 0;
                return (
                  <TableRow key={flow.year} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                    <TableCell className="text-left px-2 py-2">{flow.year}</TableCell>
                    <TableCell className="text-right px-2 py-2">{formatCurrency(flow.evRevenue)}</TableCell>
                    <TableCell className="text-right px-2 py-2">{formatCurrency(flow.solarSavings)}</TableCell>
                    <TableCell className="text-right px-2 py-2">{formatCurrency(flow.srecRevenue)}</TableCell>
                    <TableCell className="text-right px-2 py-2">{formatCurrency(flow.gridCost)}</TableCell>
                    <TableCell className="text-right px-2 py-2">{formatCurrency(flow.maintenanceCost)}</TableCell>
                    <TableCell className="text-right px-2 py-2">{formatCurrency(flow.profit)}</TableCell>
                    <TableCell className="text-right px-2 py-2">{formatCurrency(flow.taxes)}</TableCell>
                    <TableCell className="text-right px-2 py-2 font-semibold">{formatCurrency(flow.cashFlow)}</TableCell>
                    <TableCell className="text-right px-2 py-2">{formatCurrency(cumulativeCashFlow)}</TableCell>
                    <TableCell className="text-right px-2 py-2">{formatPercentage(yearlyRoi)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm">
          <p><strong>Notes:</strong></p>
          <ul className="list-disc list-inside">
            <li>All monetary values are in present value terms.</li>
            <li>Taxes are calculated at an assumed corporate tax rate of 21%.</li>
            <li>ROI is calculated as (Cumulative Cash Flow - Initial Investment) / Initial Investment.</li>
            <li>SREC Revenue may vary based on market conditions and regulatory changes.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
