import React, { useState } from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SensitivityAnalysisProps {
  baselineMetrics: {
    irr: number | null;
    paybackPeriod: number | null;
    npv: number | null;
    roi: number;
  };
  evDetails: {
    numStations: number;
    costPerStation: number;
    pricePerKwh: number;
    sessionsPerDay: number;
    energyPerSession: number;
    operationalYears: number;
  };
  solarSystem: {
    systemSize: number;
    costPerWatt: number;
  };
  incentives: {
    baseTaxCredit: number;
  };
  loanDetails: {
    apr: number;
  };
  updateEvDetails: (newDetails: Partial<SensitivityAnalysisProps['evDetails']>) => void;
  updateSolarSystem: (newSystem: Partial<SensitivityAnalysisProps['solarSystem']>) => void;
  updateIncentives: (newIncentives: Partial<SensitivityAnalysisProps['incentives']>) => void;
  updateLoanDetails: (newDetails: Partial<SensitivityAnalysisProps['loanDetails']>) => void;
}

const formatPercentage = (value: number | null): string => {
  if (value === null) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
};

const formatCurrency = (value: number | null): string => {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const formatYears = (value: number | null): string => {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)} years`;
};

export function SensitivityAnalysis({
  baselineMetrics,
  evDetails,
  solarSystem,
  incentives,
  loanDetails,
  updateEvDetails,
  updateSolarSystem,
  updateIncentives,
  updateLoanDetails
}: SensitivityAnalysisProps) {
  const [sensitivityFactor, setSensitivityFactor] = useState(1);

  const adjustedMetrics = {
    irr: baselineMetrics.irr ? baselineMetrics.irr * sensitivityFactor : null,
    paybackPeriod: baselineMetrics.paybackPeriod ? baselineMetrics.paybackPeriod / sensitivityFactor : null,
    npv: baselineMetrics.npv ? baselineMetrics.npv * sensitivityFactor : null,
    roi: baselineMetrics.roi * sensitivityFactor,
  };

  const handleSensitivityChange = (newFactor: number) => {
    setSensitivityFactor(newFactor);
    updateEvDetails({
      pricePerKwh: evDetails.pricePerKwh * newFactor,
      sessionsPerDay: evDetails.sessionsPerDay * newFactor,
    });
    updateSolarSystem({
      systemSize: solarSystem.systemSize * newFactor,
      costPerWatt: solarSystem.costPerWatt / newFactor,
    });
    updateIncentives({
      baseTaxCredit: incentives.baseTaxCredit * newFactor,
    });
    updateLoanDetails({
      apr: loanDetails.apr / newFactor,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sensitivityFactor">Sensitivity Factor</Label>
        <Slider
          id="sensitivityFactor"
          min={0.5}
          max={1.5}
          step={0.1}
          value={[sensitivityFactor]}
          onValueChange={(value) => handleSensitivityChange(value[0])}
        />
        <div className="text-sm text-gray-500">
          Adjust the slider to see how changes in key parameters affect the financial metrics.
          A factor less than 1 represents more conservative estimates, while a factor greater than 1 represents more optimistic estimates.
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead>Baseline</TableHead>
            <TableHead>Adjusted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>IRR</TableCell>
            <TableCell>{formatPercentage(baselineMetrics.irr)}</TableCell>
            <TableCell>{formatPercentage(adjustedMetrics.irr)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Payback Period</TableCell>
            <TableCell>{formatYears(baselineMetrics.paybackPeriod)}</TableCell>
            <TableCell>{formatYears(adjustedMetrics.paybackPeriod)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>NPV</TableCell>
            <TableCell>{formatCurrency(baselineMetrics.npv)}</TableCell>
            <TableCell>{formatCurrency(adjustedMetrics.npv)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>ROI</TableCell>
            <TableCell>{formatPercentage(baselineMetrics.roi)}</TableCell>
            <TableCell>{formatPercentage(adjustedMetrics.roi)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}