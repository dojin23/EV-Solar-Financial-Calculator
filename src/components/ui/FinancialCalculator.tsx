"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Zap, Sun, HelpCircle, Battery, TrendingUp, Clock, CreditCard, Gift, Award, Calculator } from 'lucide-react';
import { CashFlowTable } from "@/components/ui/CashFlowTable";
import { MetricCard } from "@/components/ui/MetricCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { pdf } from '@react-pdf/renderer';
import FinancialReportPDF from './FinancialReportPDF';
import { CheckIcon } from '@heroicons/react/24/solid';

// Utility functions
const formatCurrency = (value: number | null): string => {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

// Format IRR and ROI as percentages
const formatPercentage = (value: number | null): string => {
  if (value === null || isNaN(value)) return 'N/A';
  return `${value.toFixed(2)}%`;
};


// Display Payback Period in years without dollar sign
const formatYears = (value: number | null): string => {
  if (value === null) return 'N/A';
  return `${value.toFixed(2)} years`;
};

const calculateNPV = (cashFlows: number[], discountRate: number, initialInvestment: number): number => {
  return cashFlows.reduce((npv, cashFlow, year) => {
    return npv + cashFlow / Math.pow(1 + discountRate, year + 1);
  }, -initialInvestment);
};

const calculateIRR = (cashFlows: number[]): number | null => {
  const epsilon = 0.000001;
  let guess = 0.1;
  let maxIterations = 100;
  
  while (maxIterations > 0) {
    const npv = calculateNPV(cashFlows, guess, 0);
    if (Math.abs(npv) < epsilon) {
      return guess;
    }
    const derivativeNpv = cashFlows.reduce((acc, cf, i) => acc - i * cf / Math.pow(1 + guess, i + 1), 0);
    if (derivativeNpv === 0) return null; // Avoid division by zero
    const nextGuess = guess - npv / derivativeNpv;
    if (Math.abs(nextGuess - guess) < epsilon) {
      return nextGuess;
    }
    guess = nextGuess;
    maxIterations--;
  }
  return null; // IRR not found within the maximum number of iterations
};

const calculatePaybackPeriod = (cashFlows: number[], initialInvestment: number): number | null => {
  let cumulativeCashFlow = -initialInvestment;
  for (let i = 0; i < cashFlows.length; i++) {
    cumulativeCashFlow += cashFlows[i];
    if (cumulativeCashFlow >= 0) {
      const previousCumulative = cumulativeCashFlow - cashFlows[i];
      const fraction = (-previousCumulative) / cashFlows[i]; // Corrected formula
      return i + fraction;
    }
  }
  return null; // Investment not recovered within the period
};

const calculateLoanPayment = (principal: number, annualRate: number, termYears: number) => {
  const monthlyRate = annualRate / 12 / 100;
  const numberOfPayments = termYears * 12;
  return principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
};

export default function FinancialCalculator() {
  // All useState hooks
  const [financingType, setFinancingType] = useState('cash');
  const [loanDetails, setLoanDetails] = useState({ apr: 5, term: 10, downPayment: 20000 });
  const [location, setLocation] = useState('MD');
  const [srecEligibilityYears, setSrecEligibilityYears] = useState(5); // Default to 5 years
  const [evDetails, setEvDetails] = useState({
    numStations: 4,
    costPerStation: 50000,
    pricePerKwh: 0.45, // Price charged per kWh
    sessionsPerDay: 6, // Changed from 10 to 6
    energyPerSession: 30, // Changed from 20 to 30
    operationalYears: 20
  });
  const [solarSystem, setSolarSystem] = useState({
    systemSize: 100, // in kW
    costPerWatt: 1.8,
    annualProduction: 120000, // in kWh
  });
  const [batteryDetails, setBatteryDetails] = useState({
    numBatteries: 1,
    costPerBattery: 100000,
    capacity: 200, // kWh
    efficiency: 0.9, // 90% round-trip efficiency
    cycleLife: 4000, // number of full charge/discharge cycles
    depthOfDischarge: 0.8, // 80% depth of discharge
  });
  const [gridElectricity, setGridElectricity] = useState({
    rate: 0.12, // $/kWh
  });
  const [maintenanceCosts, setMaintenanceCosts] = useState({
    evChargerAnnual: 500, // $ per charger per year
    solarAnnual: 1000, // $ per year for entire system
    batteryAnnual: 200, // $ per year
  });
  const [incentives, setIncentives] = useState({
    baseTaxCredit: 30,
    additionalTaxCredit: false,
    utilityRebatePerCharger: 15000, // Changed from 5000 to 15000
  });
  const [annualUtilityRate, setAnnualUtilityRate] = useState(0.03);
  const [baselineElectricity, setBaselineElectricity] = useState({
    annualConsumption: 100000, // kWh
    annualCost: 12000, // $
    rate: 0.12, // $/kWh (initial value, will be updated)
  });
  const [evChargeEscalator, setEvChargeEscalator] = useState(0.02); // 2% annual increase
  const [includeBattery, setIncludeBattery] = useState(false);
  const [solarOffset, setSolarOffset] = useState(50); // Default to 50%

  // Update this whenever annualConsumption or annualCost changes
  useEffect(() => {
    if (baselineElectricity.annualConsumption > 0) {
      setBaselineElectricity(prev => ({
        ...prev,
        rate: prev.annualCost / prev.annualConsumption
      }));
    }
  }, [baselineElectricity.annualConsumption, baselineElectricity.annualCost]);

  const totalSolarCost = solarSystem.systemSize * 1000 * solarSystem.costPerWatt;
  const totalEvStationsCost = evDetails.numStations * evDetails.costPerStation;
  const totalBatteryCost = includeBattery ? batteryDetails.numBatteries * batteryDetails.costPerBattery : 0;
  const totalProjectCost = totalSolarCost + totalEvStationsCost + totalBatteryCost;

  const baseTaxCreditAmount = totalProjectCost * (incentives.baseTaxCredit / 100);
  const additionalTaxCreditAmount = incentives.additionalTaxCredit ? totalProjectCost * 0.1 : 0;
  const utilityRebateAmount = evDetails.numStations * incentives.utilityRebatePerCharger;

  const annualSrecs = Math.floor(solarSystem.annualProduction / 1000);
  const srecPrice = location === 'MD' ? 80 : location === 'DC' ? 350 : 0;
  const annualSrecRevenue = annualSrecs * srecPrice;
  const totalSrecRevenue = annualSrecRevenue * srecEligibilityYears;

  // Exclude totalSrecRevenue from totalIncentives
  const totalIncentives = baseTaxCreditAmount + additionalTaxCreditAmount + utilityRebateAmount;
  const netProjectCost = totalProjectCost - totalIncentives;

  const macrsSchedule = [0.2, 0.32, 0.192, 0.1152, 0.1152, 0.0576, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  const financialMetrics = useMemo(() => {
    const annualEvRevenue = evDetails.numStations * evDetails.sessionsPerDay * evDetails.energyPerSession * evDetails.pricePerKwh * 365;
    const loanTotalCost = financingType === 'loan' ? (loanDetails.apr / 100 * loanDetails.term * (totalProjectCost - loanDetails.downPayment)) + totalProjectCost : 0;
    const initialInvestment = netProjectCost;
    const discountRate = financingType === 'loan' ? loanDetails.apr / 100 : 0.1; // Define discount rate here

    const cashFlows = Array.from({ length: evDetails.operationalYears }, (_, year) => {
      const evEnergyDemand = evDetails.numStations * evDetails.sessionsPerDay * evDetails.energyPerSession * 365;
      const solarEnergyUsed = Math.min(solarSystem.annualProduction, evEnergyDemand * (solarOffset / 100));
      const gridEnergyUsed = Math.max(0, evEnergyDemand - solarEnergyUsed);

      const evRevenue = evDetails.numStations * evDetails.sessionsPerDay * evDetails.energyPerSession * 
        (evDetails.pricePerKwh * Math.pow(1 + evChargeEscalator, year)) * 365;
      const gridCost = gridEnergyUsed * gridElectricity.rate * Math.pow(1 + annualUtilityRate, year);
      const maintenanceCost = (maintenanceCosts.evChargerAnnual * evDetails.numStations + maintenanceCosts.solarAnnual) * Math.pow(1.03, year);
      const batteryCost = includeBattery ? maintenanceCosts.batteryAnnual * batteryDetails.numBatteries * Math.pow(1.03, year) : 0;
      const totalMaintenanceCost = maintenanceCost + batteryCost;
      const loanPayment = financingType === 'loan' && year < loanDetails.term ? calculateLoanPayment(totalProjectCost - loanDetails.downPayment, loanDetails.apr, loanDetails.term) : 0;
      
      const profit = evRevenue - gridCost - totalMaintenanceCost - loanPayment;
      const depreciableBasis = totalProjectCost - (0.5 * baseTaxCreditAmount);
      const depreciation = (macrsSchedule[year] || 0) * depreciableBasis;
      const taxableIncome = profit - depreciation;
      const taxes = taxableIncome > 0 ? taxableIncome * 0.21 : 0;
      const cashFlow = profit - taxes;
      let cumulativeCashFlow = year === 0 ? -netProjectCost : 0;
      cumulativeCashFlow += cashFlow;
      const discountedCashFlow = cashFlow / Math.pow(1 + discountRate, year + 1);

      return {
        year: year + 1,
        evRevenue,
        gridCost,
        maintenanceCost: totalMaintenanceCost,
        loanPayment,
        profit,
        taxes,
        depreciation,
        cashFlow,
        cumulativeCashFlow,
        discountedCashFlow
      };
    });

    const cashFlowsOnly = cashFlows.map(flow => flow.cashFlow);
    const npv = calculateNPV(cashFlowsOnly, discountRate, initialInvestment);
    const irr = calculateIRR([-initialInvestment, ...cashFlowsOnly]);
    const paybackPeriod = calculatePaybackPeriod(cashFlowsOnly, initialInvestment);
    const totalCashFlow = cashFlowsOnly.reduce((sum, flow) => sum + flow, 0);
    const totalYears = evDetails.operationalYears;
    const roi = ((totalCashFlow - initialInvestment) / initialInvestment) * 100;
    const annualizedROI = roi / totalYears;

    const evEnergyDemand = evDetails.numStations * evDetails.sessionsPerDay * evDetails.energyPerSession * 365;
    const solarEnergyUsed = Math.min(solarSystem.annualProduction, evEnergyDemand * (solarOffset / 100));

    return {
      totalProjectCost,
      totalIncentives,
      netProjectCost,
      incentivePercentage: (totalIncentives / totalProjectCost) * 100,
      annualEvRevenue,
      baseTaxCreditAmount,
      additionalTaxCreditAmount,
      utilityRebateAmount,
      irr: irr !== null ? irr * 100 : null,
      paybackPeriod: paybackPeriod !== null ? paybackPeriod : null,
      npv: !isNaN(npv) ? npv : null,
      totalRevenue: totalCashFlow,
      annualSrecRevenue,
      annualizedROI: annualizedROI * 100,
      cashFlows,
      loanTotalCost,
      evEnergyDemand,
      solarEnergyUsed,
      roi,
      annualizedROI
    };
  }, [evDetails, solarSystem, baselineElectricity.rate, loanDetails, totalProjectCost, totalIncentives, netProjectCost, baseTaxCreditAmount, additionalTaxCreditAmount, utilityRebateAmount, totalSrecRevenue, annualSrecRevenue, evChargeEscalator, financingType, solarOffset, gridElectricity, annualUtilityRate, includeBattery, batteryDetails, macrsSchedule, maintenanceCosts.batteryAnnual, maintenanceCosts.evChargerAnnual, maintenanceCosts.solarAnnual]);

  // All useCallback hooks
  const validateInput = useCallback((value: string, min: number, max: number) => {
    const num = parseFloat(value);
    return isNaN(num) ? min : Math.max(min, Math.min(max, num));
  }, []);

  const renderInputField = useCallback(({ 
    id, 
    label, 
    value, 
    onChange, 
    min, 
    max, 
    step, 
    tooltip 
  }: {
    id: string;
    label: string;
    value: number | string;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
    tooltip: string;
  }) => {
    return (
      <div key={id} className="mb-4 relative">
        <Label htmlFor={id} className="flex items-center">
          {label}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="ml-1 h-4 w-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-800 text-white p-2 rounded-md shadow-lg">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(validateInput(e.target.value, min, max))}
          min={min}
          max={max}
          step={step}
          className="mt-1"
        />
      </div>
    );
  }, [validateInput]);

  // Render function for battery details input fields
  const renderBatteryInputFields = () => (
    <>
      {renderInputField({
        id: "numBatteries",
        label: "Number of Batteries",
        value: batteryDetails.numBatteries,
        onChange: (value) => setBatteryDetails(prev => ({ ...prev, numBatteries: value })),
        min: 1,
        max: 100,
        step: 1,
        tooltip: "The number of battery units in the system"
      })}
      {renderInputField({
        id: "costPerBattery",
        label: "Cost per Battery ($)",
        value: batteryDetails.costPerBattery,
        onChange: (value) => setBatteryDetails(prev => ({ ...prev, costPerBattery: value })),
        min: 0,
        max: 1000000,
        step: 1000,
        tooltip: "The cost of each battery unit"
      })}
      {renderInputField({
        id: "batteryCapacity",
        label: "Battery Capacity (kWh)",
        value: batteryDetails.capacity,
        onChange: (value) => setBatteryDetails(prev => ({ ...prev, capacity: value })),
        min: 1,
        max: 1000,
        step: 1,
        tooltip: "The capacity of each battery unit in kilowatt-hours"
      })}
      {renderInputField({
        id: "batteryEfficiency",
        label: "Round-trip Efficiency (%)",
        value: batteryDetails.efficiency * 100,
        onChange: (value) => setBatteryDetails(prev => ({ ...prev, efficiency: value / 100 })),
        min: 0,
        max: 100,
        step: 1,
        tooltip: "The round-trip efficiency of the battery storage system"
      })}
      {renderInputField({
        id: "batteryCycleLife",
        label: "Cycle Life (full charge/discharge cycles)",
        value: batteryDetails.cycleLife,
        onChange: (value) => setBatteryDetails(prev => ({ ...prev, cycleLife: value })),
        min: 1,
        max: 10000,
        step: 100,
        tooltip: "The expected number of full charge/discharge cycles for the battery storage system"
      })}
      {renderInputField({
        id: "batteryDepthOfDischarge",
        label: "Depth of Discharge (%)",
        value: batteryDetails.depthOfDischarge * 100,
        onChange: (value) => setBatteryDetails(prev => ({ ...prev, depthOfDischarge: value / 100 })),
        min: 0,
        max: 100,
        step: 1,
        tooltip: "The depth of discharge for the battery storage system"
      })}
      <div className="pt-4 border-t">
        <div className="font-semibold flex items-center mb-2">
          Total Battery System Cost
          {renderTooltip(
            "Total Battery System Cost",
            formatCurrency(batteryDetails.numBatteries * batteryDetails.costPerBattery),
            "Number of Batteries × Cost per Battery"
          )}
        </div>
        <p className="text-2xl font-bold text-primary">
          {formatCurrency(batteryDetails.numBatteries * batteryDetails.costPerBattery)}
        </p>
      </div>
    </>
  );

  // Render function for baseline electricity input fields
  const renderBaselineElectricityInputFields = () => (
    <>
      {renderInputField({
        id: "baselineAnnualConsumption",
        label: "Annual Electricity Consumption (kWh)",
        value: baselineElectricity.annualConsumption,
        onChange: (value) => setBaselineElectricity(prev => ({ ...prev, annualConsumption: value })),
        min: 0,
        max: 1000000,
        step: 1000,
        tooltip: "The annual electricity consumption before installing EV chargers and solar"
      })}
      {renderInputField({
        id: "baselineAnnualCost",
        label: "Annual Electricity Cost ($)",
        value: baselineElectricity.annualCost,
        onChange: (value) => setBaselineElectricity(prev => ({ ...prev, annualCost: value })),
        min: 0,
        max: 1000000,
        step: 100,
        tooltip: "The annual electricity cost before installing EV chargers and solar"
      })}
      <div className="pt-4 border-t">
        <div className="font-semibold flex items-center mb-2">
          Electricity Cost per kWh
          {renderTooltip(
            "Electricity Cost per kWh",
            formatCurrency(baselineElectricity.rate),
            "Annual Cost / Annual Consumption"
          )}
        </div>
        <p className="text-2xl font-bold text-primary">
          {formatCurrency(baselineElectricity.rate)} / kWh
        </p>
      </div>
    </>
  );

  const renderTooltip = useCallback((label: string, value: string, formula: string) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="ml-1 cursor-help">
            <HelpCircle className="inline h-4 w-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <p className="font-bold">{label}</p>
            <p>{value}</p>
            <p className="text-xs mt-2">Formula:</p>
            <p className="text-xs italic break-words">{formula}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ), []);

  const renderCashFlowChart = () => {
    const chartData = financialMetrics.cashFlows.map((cf, index) => ({
      year: index,
      'EV Revenue': cf.evRevenue,
      'Cash Flow': cf.cashFlow
    }));

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <RechartsTooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
          <Line type="monotone" dataKey="EV Revenue" stroke="#8884d8" />
          <Line type="monotone" dataKey="Cash Flow" stroke="#ff7300" />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const handleLoanDetailsChange = (field: keyof typeof loanDetails, value: number) => {
    setLoanDetails(prev => ({ ...prev, [field]: value }));
  };

  const renderEscalatorDropdown = () => (
    <div className="mb-4 relative">
      <Label htmlFor="evChargeEscalator" className="flex items-center mb-2">
        EV Charge Price Escalator
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-gray-800 text-white p-2 rounded-md shadow-lg">
              <p className="text-sm">Annual increase rate for EV charging price</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Label>
      <Select value={evChargeEscalator.toString()} onValueChange={(value) => setEvChargeEscalator(parseFloat(value))}>
        <SelectTrigger className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary">
          <SelectValue placeholder="Select escalator rate" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-300 rounded-md shadow-lg">
          {Array.from({ length: 30 }, (_, i) => i / 100).map((rate) => (
            <SelectItem key={rate} value={rate.toString()} className="px-3 py-2 hover:bg-gray-100">
              {(rate * 100).toFixed(2)}%
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const generateDebugOutput = () => {
    const debugOutput = {
      totalSolarCost,
      totalEvStationsCost,
      totalBatteryCost,
      totalProjectCost,
      baseTaxCreditAmount,
      additionalTaxCreditAmount,
      utilityRebateAmount,
      totalIncentives,
      netProjectCost,
      financingType,
      loanAmount: financingType === 'loan' ? totalProjectCost - loanDetails.downPayment : 0,
      monthlyLoanPayment: financingType === 'loan' ? calculateLoanPayment(totalProjectCost - loanDetails.downPayment, loanDetails.apr, loanDetails.term) : 0,
      annualEvRevenue: financialMetrics.annualEvRevenue,
      paybackPeriod: financialMetrics.paybackPeriod,
      npv: financialMetrics.npv,
      irr: financialMetrics.irr,
      roi: financialMetrics.roi,
      annualizedROI: financialMetrics.annualizedROI,
      evChargeEscalator: `${(evChargeEscalator * 100).toFixed(2)}%`,
      annualUtilityRate: `${(annualUtilityRate * 100).toFixed(2)}%`,
      firstYearCashFlow: financialMetrics.cashFlows[0]?.cashFlow || 0,
      fifthYearCashFlow: financialMetrics.cashFlows[4]?.cashFlow || 0,
      tenthYearCashFlow: financialMetrics.cashFlows[9]?.cashFlow || 0,
      loanTotalCost: financialMetrics.loanTotalCost,
      depreciationSchedule: JSON.stringify(financialMetrics.cashFlows.map(flow => ({
        year: flow.year,
        depreciation: flow.depreciation.toFixed(2)
      })))
    };
    return JSON.stringify(debugOutput, null, 2);
  };

  const DepreciationSchedule = ({ schedule }) => (
    <table>
      <thead>
        <tr>
          <th>Year</th>
          <th>Depreciation</th>
        </tr>
      </thead>
      <tbody>
        {schedule.map(({ year, depreciation }) => (
          <tr key={year}>
            <td>{year}</td>
            <td>{formatCurrency(depreciation)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const generatePDF = () => {
    const blob = pdf(<FinancialReportPDF financialMetrics={financialMetrics} cashFlows={financialMetrics.cashFlows} evDetails={evDetails} solarSystem={solarSystem} />).toBlob();
    blob.then(blobData => {
      const url = URL.createObjectURL(blobData);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'EV_Solar_Financial_Report.pdf';
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  // Render
  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">EV Station and Solar Project Financial Calculator</h1>
        
        {/* Total Cost and Incentives Summary */}
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center text-xl">
              <DollarSign className="mr-2 h-6 w-6" />
              Project Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="font-semibold text-lg mb-2">Total Project Cost</p>
                <p className="text-3xl font-bold">{formatCurrency(totalProjectCost)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="font-semibold text-lg mb-2">Total Incentives</p>
                <p className="text-3xl font-bold">{formatCurrency(totalIncentives)}</p>
                <p className="text-sm mt-1">
                  ({financialMetrics.incentivePercentage.toFixed(1)}% of total project cost)
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="font-semibold text-lg mb-2">Net Project Cost</p>
                <p className="text-3xl font-bold">{formatCurrency(netProjectCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Solar System Details Card */}
          <Card className="shadow-lg">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center text-xl">
                <Sun className="mr-2 h-6 w-6" />
                Solar System Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="systemSize">System Size (kW)</Label>
                <Input
                  id="systemSize"
                  type="number"
                  value={solarSystem.systemSize}
                  onChange={(e) => setSolarSystem({ ...solarSystem, systemSize: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPerWatt">Cost per Watt ($)</Label>
                <Input
                  id="costPerWatt"
                  type="number"
                  value={solarSystem.costPerWatt}
                  onChange={(e) => setSolarSystem({ ...solarSystem, costPerWatt: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annualProduction">Annual Production (kWh)</Label>
                <Input
                  id="annualProduction"
                  type="number"
                  value={solarSystem.annualProduction}
                  onChange={(e) => setSolarSystem({ ...solarSystem, annualProduction: Number(e.target.value) })}
                />
              </div>
              {renderInputField({
                id: "solarOffset",
                label: "Solar Offset (%)",
                value: solarOffset,
                onChange: (value) => setSolarOffset(value),
                min: 0,
                max: 100,
                step: 1,
                tooltip: "The percentage of EV charging energy offset by solar production"
              })}
              <div className="pt-4 border-t">
                <div className="font-semibold flex items-center mb-2">
                  Total Solar System Cost
                  {renderTooltip(
                    "Total Solar System Cost",
                    formatCurrency(totalSolarCost),
                    "System Size (kW) × 1000 × Cost per Watt"
                  )}
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(totalSolarCost)}
                </p>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center space-x-2 mt-4">
                  <div className="relative w-5 h-5 border-2 border-gray-300 rounded-sm">
                    <Checkbox
                      id="includeBattery"
                      checked={includeBattery}
                      onCheckedChange={(checked) => setIncludeBattery(checked as boolean)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {includeBattery && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                  <Label htmlFor="includeBattery" className="font-semibold text-sm">Include Battery Storage System</Label>
                </div>
                {includeBattery && (
                  <div className="mt-4 space-y-4">
                    <h3 className="font-semibold">Battery Details</h3>
                    {renderBatteryInputFields()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* EV Station Details */}
          <Card className="shadow-lg">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center text-xl">
                <Zap className="mr-2 h-6 w-6" />
                EV Station Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {renderInputField({
                id: "numStations",
                label: "Number of EV Stations",
                value: evDetails.numStations,
                onChange: (value) => setEvDetails(prev => ({ ...prev, numStations: value })),
                min: 1,
                max: 100,
                step: 1,
                tooltip: "The number of EV charging stations to be installed"
              })}
              {renderInputField({
                id: "costPerStation",
                label: "Cost per Station ($)",
                value: evDetails.costPerStation,
                onChange: (value) => setEvDetails(prev => ({ ...prev, costPerStation: value })),
                min: 0,
                max: 1000000,
                step: 1000,
                tooltip: "The cost for each EV charging station"
              })}
              {renderInputField({
                id: "pricePerKwh",
                label: "Price per kWh ($)",
                value: evDetails.pricePerKwh,
                onChange: (value) => setEvDetails(prev => ({ ...prev, pricePerKwh: value })),
                min: 0,
                max: 2,
                step: 0.01,
                tooltip: "The price charged per kilowatt-hour for EV charging"
              })}
              {renderInputField({
                id: "sessionsPerDay",
                label: "Average Sessions per Day (per station)",
                value: evDetails.sessionsPerDay,
                onChange: (value) => setEvDetails(prev => ({ ...prev, sessionsPerDay: value })),
                min: 0,
                max: 100,
                step: 1,
                tooltip: "The average number of charging sessions per station per day"
              })}
              {renderInputField({
                id: "energyPerSession",
                label: "Average Energy per Session (kWh)",
                value: evDetails.energyPerSession,
                onChange: (value) => setEvDetails(prev => ({ ...prev, energyPerSession: value })),
                min: 1,
                max: 200,
                step: 1,
                tooltip: "The average energy dispensed per charging session in kilowatt-hours"
              })}
              {renderInputField({
                id: "operationalYears",
                label: "Operational Years",
                value: evDetails.operationalYears,
                onChange: (value) => setEvDetails(prev => ({ ...prev, operationalYears: value })),
                min: 1,
                max: 50,
                step: 1,
                tooltip: "The expected operational lifespan of the EV charging stations in years"
              })}
              {renderEscalatorDropdown()}
              <div className="pt-4 border-t">
                <div className="font-semibold flex items-center mb-2">
                  Annual EV Revenue
                  {renderTooltip(
                    "Annual EV Revenue",
                    formatCurrency(financialMetrics.annualEvRevenue),
                    "Number of Stations × Sessions per Day × Energy per Session × Price per kWh × 365 days"
                  )}
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(financialMetrics.annualEvRevenue)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Baseline Electricity Consumption Card */}
          <Card className="shadow-lg">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center text-xl">
                <Zap className="mr-2 h-6 w-6" />
                Baseline Electricity Consumption
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {renderBaselineElectricityInputFields()}
            </CardContent>
          </Card>

          {/* Incentives and Location Card */}
          <Card className="shadow-lg">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center text-xl">
                <DollarSign className="mr-2 h-6 w-6" />
                Incentives and Location
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {renderInputField({
                id: "baseTaxCredit",
                label: "Base Tax Credit (%)",
                value: incentives.baseTaxCredit,
                onChange: (value) => setIncentives(prev => ({ ...prev, baseTaxCredit: value })),
                min: 0,
                max: 100,
                step: 1,
                tooltip: "The base tax credit percentage"
              })}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="additionalTaxCredit"
                  checked={incentives.additionalTaxCredit}
                  onChange={(e) => setIncentives(prev => ({ ...prev, additionalTaxCredit: e.target.checked }))}
                  className="h-4 w-4 rounded bg-gray-100 text-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                />
                <Label htmlFor="additionalTaxCredit">Additional 10% Tax Credit</Label>
              </div>
              {renderInputField({
                id: "utilityRebatePerCharger",
                label: "Utility Rebate per Charger ($)",
                value: incentives.utilityRebatePerCharger,
                onChange: (value) => setIncentives(prev => ({ ...prev, utilityRebatePerCharger: value })),
                min: 0,
                max: 100000,
                step: 100,
                tooltip: "The rebate amount per DCFC charger from the utility company"
              })}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger id="location" className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-300 rounded-md shadow-lg">
                    <SelectItem value="MD" className="px-3 py-2 hover:bg-gray-100">Maryland (SREC: $80)</SelectItem>
                    <SelectItem value="DC" className="px-3 py-2 hover:bg-gray-100">Washington D.C. (SREC: $350)</SelectItem>
                    <SelectItem value="Other" className="px-3 py-2 hover:bg-gray-100">Other (No SREC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {(location === 'MD' || location === 'DC') && (
                renderInputField({
                  id: "srecEligibilityYears",
                  label: "SREC Eligibility Period (years)",
                  value: srecEligibilityYears,
                  onChange: setSrecEligibilityYears,
                  min: 1,
                  max: 25,
                  step: 1,
                  tooltip: "The number of years the system is eligible for SRECs"
                })
              )}

              {/* Incentives Breakdown */}
              <div className="space-y-2">
                <p className="font-semibold">Incentives Breakdown:</p>
                <p>Base Tax Credit: {formatCurrency(baseTaxCreditAmount)}</p>
                <p>Additional Tax Credit: {formatCurrency(additionalTaxCreditAmount)}</p>
                <p>Utility Rebate: {formatCurrency(utilityRebateAmount)}</p>
                <p>SREC Revenue: {formatCurrency(totalSrecRevenue)} ({srecEligibilityYears} years)</p>
                <p className="font-semibold mt-2">
                  Total Incentives: {formatCurrency(totalIncentives)} ({financialMetrics.incentivePercentage.toFixed(1)}% of total project cost)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Financing Options Card */}
          <Card className="shadow-lg">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center text-xl">
                <DollarSign className="mr-2 h-6 w-6" />
                Financing Options
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <Select value={financingType} onValueChange={setFinancingType}>
                <SelectTrigger id="financingType" className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="Select financing type" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-300 rounded-md shadow-lg">
                  <SelectItem value="loan" className="px-3 py-2 hover:bg-gray-100">Loan</SelectItem>
                  <SelectItem value="cash" className="px-3 py-2 hover:bg-gray-100">Cash</SelectItem>
                </SelectContent>
              </Select>
              {financingType === 'loan' ? (
                <>
                  {renderInputField({
                    id: "apr",
                    label: "Annual Percentage Rate (APR)",
                    value: loanDetails.apr,
                    onChange: (value) => handleLoanDetailsChange('apr', value),
                    min: 0,
                    max: 20,
                    step: 0.1,
                    tooltip: "The annual interest rate for the loan"
                  })}
                  {renderInputField({
                    id: "term",
                    label: "Loan Term (years)",
                    value: loanDetails.term,
                    onChange: (value) => handleLoanDetailsChange('term', value),
                    min: 1,
                    max: 30,
                    step: 1,
                    tooltip: "The duration of the loan in years"
                  })}
                  {renderInputField({
                    id: "downPayment",
                    label: "Down Payment ($)",
                    value: loanDetails.downPayment,
                    onChange: (value) => handleLoanDetailsChange('downPayment', value),
                    min: 0,
                    max: totalProjectCost,
                    step: 1000,
                    tooltip: "The initial payment amount for the loan"
                  })}
                  <div className="mt-4 p-4 bg-gray-100 rounded-md">
                    <p className="text-sm text-gray-600">
                      <strong>Total Principal Amount:</strong> {formatCurrency(totalProjectCost - loanDetails.downPayment)}<br />
                      <strong>Total Interest:</strong> {formatCurrency((calculateLoanPayment(totalProjectCost - loanDetails.downPayment, loanDetails.apr, loanDetails.term) * 12 * loanDetails.term) - (totalProjectCost - loanDetails.downPayment))}<br />
                      <strong>Total Loan Amount:</strong> {formatCurrency(calculateLoanPayment(totalProjectCost - loanDetails.downPayment, loanDetails.apr, loanDetails.term) * 12 * loanDetails.term)}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">Full cash payment of {formatCurrency(totalProjectCost)} at the start of the project.</p>
              )}
            </CardContent>
          </Card>

          {/* Financial Metrics Dashboard and Interactive Chart Card */}
          <Card className="shadow-lg col-span-full mt-6">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center text-xl">
                <DollarSign className="mr-2 h-6 w-6" />
                Financial Metrics Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                  title="Internal Rate of Return (IRR)"
                  value={formatPercentage(financialMetrics.irr)}
                  icon={<TrendingUp className="h-6 w-6 text-blue-500" />}
                  tooltip="The Internal Rate of Return (IRR) is the discount rate that makes the NPV of all cash flows equal to zero."
                />
                <MetricCard
                  title="Payback Period"
                  value={formatYears(financialMetrics.paybackPeriod)}
                  icon={<Clock className="h-6 w-6 text-yellow-500" />}
                  tooltip="The Payback Period is the time it takes for the cumulative cash flow to become positive, essentially recovering the initial investment."
                />
                <MetricCard
                  title="Net Present Value (NPV)"
                  value={formatCurrency(financialMetrics.npv)}
                  icon={<DollarSign className="h-6 w-6 text-green-500" />}
                  tooltip={`The Net Present Value (NPV) is ${formatCurrency(financialMetrics.npv)}. This represents the difference between the present value of cash inflows and outflows over the project's lifetime, discounted at a rate of ${financingType === 'loan' ? loanDetails.apr : 10}%. A positive NPV indicates that the project is financially viable. Formula: NPV = Σ(Cash Flow / (1 + Discount Rate)^t) - Initial Investment`}
                />
                <MetricCard
                  title={`Total Revenue (${evDetails.operationalYears} years)`}
                  value={formatCurrency(financialMetrics.totalRevenue)}
                  icon={<CreditCard className="h-6 w-6 text-green-500" />}
                  tooltip={`The Total Revenue over the project lifetime is ${formatCurrency(financialMetrics.totalRevenue)}. This includes EV charging revenue, solar savings, and SREC revenue. It's calculated by summing these components for each year of the project's operational life.`}
                />
                <MetricCard
                  title="Total Incentives"
                  value={formatCurrency(financialMetrics.totalIncentives)}
                  icon={<Gift className="h-6 w-6 text-purple-500" />}
                  tooltip={`The Total Incentives are ${formatCurrency(financialMetrics.totalIncentives)}. This represents the total amount of financial incentives received for the project, including Base Tax Credit, Additional Tax Credit, Utility Rebate, and SREC Revenue.`}
                />
                <MetricCard
                  title="Annual EV Revenue"
                  value={formatCurrency(financialMetrics.annualEvRevenue)}
                  icon={<Zap className="h-6 w-6 text-blue-500" />}
                  tooltip={`The Annual EV Revenue is ${formatCurrency(financialMetrics.annualEvRevenue)}. This represents the yearly revenue generated from EV charging. It's calculated as: Number of EV Stations × Average Sessions per Day × Average Energy per Session × Price per kWh × 365`}
                />
                <MetricCard
                  title="Annual SREC Revenue"
                  value={formatCurrency(financialMetrics.annualSrecRevenue)}
                  icon={<Award className="h-6 w-6 text-purple-500" />}
                  tooltip={`The Annual SREC Revenue is ${formatCurrency(financialMetrics.annualSrecRevenue)}. This is the yearly income from selling Solar Renewable Energy Credits. It's calculated as: (Annual Solar Production / 1000) × SREC Price. Note that SREC prices can vary by location and market conditions.`}
                />
                <MetricCard
                  title="Annualized ROI"
                  value={formatPercentage(financialMetrics.annualizedROI)}
                  icon={<TrendingUp className="h-6 w-6 text-blue-500" />}
                  tooltip="The Annualized ROI represents the average annual return over the operational years."
                />
              </div>
              {/* Add Cash Flow Projection Chart here if needed */}
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Table */}
        {/* Commented out to hide the cash flow table
        {financialMetrics.cashFlows && financialMetrics.cashFlows.length > 0 && (
          <CashFlowTable
            cashFlows={financialMetrics.cashFlows}
            initialInvestment={netProjectCost}
          />
        )}
        */}

        {/* Detailed Financial Schedule */}
        <Card className="shadow-lg col-span-full mt-6">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center text-xl">
              <Calculator className="mr-2 h-6 w-6" />
              Detailed Financial Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1 text-left">Year</th>
                  <th className="px-2 py-1 text-right">EV Revenue</th>
                  <th className="px-2 py-1 text-right">Grid Cost</th>
                  <th className="px-2 py-1 text-right">Maintenance Cost</th>
                  <th className="px-2 py-1 text-right">Loan Payment</th>
                  <th className="px-2 py-1 text-right">Profit</th>
                  <th className="px-2 py-1 text-right">Depreciation</th>
                  <th className="px-2 py-1 text-right">Taxes</th>
                  <th className="px-2 py-1 text-right">Cash Flow</th>
                  <th className="px-2 py-1 text-right">Cumulative Cash Flow</th>
                  <th className="px-2 py-1 text-right">Discounted Cash Flow</th>
                  <th className="px-2 py-1 text-right">Cumulative ROI</th>
                </tr>
              </thead>
              <tbody>
                {financialMetrics.cashFlows.map((flow, index) => {
                  const cumulativeCashFlow = financialMetrics.cashFlows.slice(0, index + 1).reduce((sum, f) => sum + f.cashFlow, 0) - netProjectCost;
                  const discountedCashFlow = flow.cashFlow / Math.pow(1 + (loanDetails.apr / 100), index + 1);
                  const cumulativeROI = ((cumulativeCashFlow + netProjectCost) / netProjectCost - 1) * 100;
                  return (
                    <tr key={flow.year} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-2 py-1">{flow.year}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(flow.evRevenue)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(flow.gridCost)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(flow.maintenanceCost)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(flow.loanPayment)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(flow.profit)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(flow.depreciation)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(flow.taxes)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(flow.cashFlow)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(cumulativeCashFlow)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(discountedCashFlow)}</td>
                      <td className="px-2 py-1 text-right">{formatPercentage(cumulativeROI)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 space-y-2">
              <p><strong>Initial Investment:</strong> {formatCurrency(totalProjectCost)}</p>
              <p><strong>NPV:</strong> {formatCurrency(financialMetrics.npv)}</p>
              <p><strong>IRR:</strong> {formatPercentage(financialMetrics.irr)}</p>
              <p><strong>Payback Period:</strong> {formatYears(financialMetrics.paybackPeriod)}</p>
              <p><strong>ROI:</strong> {formatPercentage(financialMetrics.roi)}</p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={generatePDF} className="mt-4">
          Generate PDF Report
        </Button>
      </div>
    </TooltipProvider>
  );
}
