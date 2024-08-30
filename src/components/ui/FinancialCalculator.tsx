"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Zap, Sun, HelpCircle, Battery, TrendingUp, Clock, CreditCard, Gift, Award } from 'lucide-react';
import { CashFlowTable } from "@/components/ui/CashFlowTable";
import { MetricCard } from "@/components/ui/MetricCard";

// Utility functions
const formatCurrency = (value: number | null): string => {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const formatPercentage = (value: number | null): string => {
  if (value === null) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
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
      return i + (cumulativeCashFlow / cashFlows[i]);
    }
  }
  return null; // Payback period not reached
};

const calculateLoanPayment = (principal: number, annualRate: number, termYears: number) => {
  const monthlyRate = annualRate / 12 / 100;
  const numberOfPayments = termYears * 12;
  return principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
};

export default function FinancialCalculator() {
  // All useState hooks
  const [financingType, setFinancingType] = useState('loan');
  const [loanDetails, setLoanDetails] = useState({ apr: 5, term: 10, downPayment: 20000 });
  const [location, setLocation] = useState('MD');
  const [srecEligibilityYears, setSrecEligibilityYears] = useState(5); // Default to 5 years
  const [evDetails, setEvDetails] = useState({
    numStations: 4,
    costPerStation: 50000,
    pricePerKwh: 0.45, // Price charged per kWh
    sessionsPerDay: 10, // Average sessions per day per station
    energyPerSession: 20, // Average kWh per session
    operationalYears: 20
  });
  const [solarSystem, setSolarSystem] = useState({
    systemSize: 100, // in kW
    costPerWatt: 1.8,
    annualProduction: 120000, // in kWh
  });
  const [batteryDetails, setBatteryDetails] = useState({
    totalCost: 100000, // Total cost of the battery system
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
    utilityRebatePerCharger: 5000,
  });
  const [annualUtilityRate, setAnnualUtilityRate] = useState(0.12);
  const [baselineElectricity, setBaselineElectricity] = useState({
    annualConsumption: 100000, // kWh
    annualCost: 12000, // $
    rate: 0.12, // $/kWh
  });

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
  const totalProjectCost = totalSolarCost + totalEvStationsCost;

  const baseTaxCreditAmount = totalProjectCost * (incentives.baseTaxCredit / 100);
  const additionalTaxCreditAmount = incentives.additionalTaxCredit ? totalProjectCost * 0.1 : 0;
  const utilityRebateAmount = evDetails.numStations * incentives.utilityRebatePerCharger;

  const annualSrecs = Math.floor(solarSystem.annualProduction / 1000);
  const srecPrice = location === 'MD' ? 80 : location === 'DC' ? 350 : 0;
  const annualSrecRevenue = annualSrecs * srecPrice;
  const totalSrecRevenue = annualSrecRevenue * srecEligibilityYears;

  const totalIncentives = baseTaxCreditAmount + additionalTaxCreditAmount + utilityRebateAmount + totalSrecRevenue;
  const netProjectCost = totalProjectCost - totalIncentives;

  const cashFlows = useMemo(() => {
    const loanAmount = netProjectCost - loanDetails.downPayment;
    const monthlyPayment = calculateLoanPayment(loanAmount, loanDetails.apr, loanDetails.term);
    const annualPayment = monthlyPayment * 12;

    return Array.from({ length: evDetails.operationalYears }, (_, year) => {
      const evRevenue = evDetails.numStations * evDetails.sessionsPerDay * evDetails.energyPerSession * evDetails.pricePerKwh * 365;
      const solarSavings = solarSystem.annualProduction * baselineElectricity.rate;
      const srecRevenue = year < srecEligibilityYears ? annualSrecRevenue : 0;
      const gridCost = 0; // Assuming no grid cost for simplicity
      const maintenanceCost = maintenanceCosts.evChargerAnnual * evDetails.numStations + maintenanceCosts.solarAnnual;
      const loanPayment = year < loanDetails.term ? annualPayment : 0;
      
      // Add utility rebate only in the first year
      const utilityRebate = year === 0 ? utilityRebateAmount : 0;
      
      const profit = evRevenue + solarSavings + srecRevenue + utilityRebate - gridCost - maintenanceCost - loanPayment;
      const taxes = profit * 0.21; // Assuming 21% corporate tax rate
      const cashFlow = profit - taxes;

      return {
        year: year + 1,
        evRevenue,
        solarSavings,
        srecRevenue,
        utilityRebate,
        gridCost,
        maintenanceCost,
        loanPayment,
        profit,
        taxes,
        cashFlow
      };
    });
  }, [evDetails, solarSystem, baselineElectricity.rate, srecEligibilityYears, location, maintenanceCosts, netProjectCost, loanDetails, annualSrecRevenue, utilityRebateAmount]);

  // All useMemo hooks
  const financialMetrics = useMemo(() => {
    const annualEvRevenue = evDetails.numStations * evDetails.sessionsPerDay * evDetails.energyPerSession * evDetails.pricePerKwh * 365;
    const annualSolarSavings = solarSystem.annualProduction * baselineElectricity.rate;

    const cashFlowsWithInitialInvestment = [-netProjectCost, ...cashFlows.map(flow => flow.cashFlow)];
    const irr = calculateIRR(cashFlowsWithInitialInvestment);
    const npv = calculateNPV(cashFlows.map(flow => flow.cashFlow), loanDetails.apr / 100, netProjectCost);
    const paybackPeriod = calculatePaybackPeriod(cashFlows.map(flow => flow.cashFlow), netProjectCost);

    const totalCashFlow = cashFlows.reduce((sum, flow) => sum + flow.cashFlow, 0);
    const roi = (totalCashFlow - netProjectCost) / netProjectCost;

    return {
      totalProjectCost,
      totalIncentives,
      netProjectCost,
      incentivePercentage: (totalIncentives / totalProjectCost) * 100,
      annualEvRevenue,
      baseTaxCreditAmount,
      additionalTaxCreditAmount,
      utilityRebateAmount,
      totalSrecRevenue,
      irr: irr !== null ? irr : null,
      paybackPeriod: paybackPeriod !== null ? paybackPeriod : null,
      npv: !isNaN(npv) ? npv : null,
      totalRevenue: totalCashFlow,
      annualSolarSavings,
      annualSrecRevenue,
      roi,
      cashFlows
    };
  }, [cashFlows, evDetails, solarSystem, baselineElectricity.rate, loanDetails, totalProjectCost, totalIncentives, netProjectCost, baseTaxCreditAmount, additionalTaxCreditAmount, utilityRebateAmount, totalSrecRevenue, annualSrecRevenue]);

  // All useCallback hooks
  const validateInput = useCallback((value, min, max) => {
    const num = parseFloat(value);
    return isNaN(num) ? min : Math.max(min, Math.min(max, num));
  }, []);

  const renderInputField = useCallback(({ id, label, value, onChange, min, max, step, tooltip }) => {
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
        id: "batteryTotalCost",
        label: "Total Battery System Cost ($)",
        value: batteryDetails.totalCost,
        onChange: (value) => setBatteryDetails(prev => ({ ...prev, totalCost: value })),
        min: 0,
        max: 1000000,
        step: 1000,
        tooltip: "The total cost of the battery storage system"
      })}
      {renderInputField({
        id: "batteryCapacity",
        label: "Battery Capacity (kWh)",
        value: batteryDetails.capacity,
        onChange: (value) => setBatteryDetails(prev => ({ ...prev, capacity: value })),
        min: 1,
        max: 1000,
        step: 1,
        tooltip: "The capacity of the battery storage system in kilowatt-hours"
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
    </>
  );

  const renderTooltip = useCallback((label: string, value: string, formula: string) => (
    <Tooltip content={
      <div className="space-y-2">
        <p className="font-bold">{label}</p>
        <p>{value}</p>
        <p className="text-xs mt-2">Formula:</p>
        <p className="text-xs italic break-words">{formula}</p>
      </div>
    }>
      <span className="ml-1 cursor-help">
        <HelpCircle className="inline h-4 w-4" />
      </span>
    </Tooltip>
  ), []);

  const renderCashFlowChart = () => {
    const chartData = financialMetrics.cashFlows.map((cf, index) => ({
      year: index,
      'EV Revenue': cf.evRevenue,
      'Solar Savings': cf.solarSavings,
      'SREC Revenue': cf.srecRevenue,
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
          <Line type="monotone" dataKey="Solar Savings" stroke="#82ca9d" />
          <Line type="monotone" dataKey="SREC Revenue" stroke="#ffc658" />
          <Line type="monotone" dataKey="Cash Flow" stroke="#ff7300" />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const handleLoanDetailsChange = (field: keyof typeof loanDetails, value: number) => {
    setLoanDetails(prev => ({ ...prev, [field]: value }));
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
              <div className="space-y-2">
                <Label htmlFor="annualEvRevenue">Annual EV Revenue</Label>
                <Input
                  id="annualEvRevenue"
                  type="text"
                  value={formatCurrency(financialMetrics.annualEvRevenue)}
                  readOnly
                />
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
                  <SelectTrigger id="location" className="border border-input">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MD">Maryland (SREC: $80)</SelectItem>
                    <SelectItem value="DC">Washington D.C. (SREC: $350)</SelectItem>
                    <SelectItem value="CA">California (No SREC)</SelectItem>
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
                <SelectTrigger id="financingType">
                  <SelectValue placeholder="Select financing type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
              {financingType === 'loan' && (
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
                    max: 1000000,
                    step: 1000,
                    tooltip: "The initial payment amount for the loan"
                  })}
                </>
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
                  value={financialMetrics.irr !== null ? `${(financialMetrics.irr * 100).toFixed(2)}%` : 'N/A'}
                  icon={<TrendingUp className="h-6 w-6 text-blue-500" />}
                  tooltip="The Internal Rate of Return (IRR) is the discount rate that makes the NPV of all cash flows equal to zero."
                />
                <MetricCard
                  title="Payback Period"
                  value={financialMetrics.paybackPeriod !== null ? `${financialMetrics.paybackPeriod.toFixed(2)} years` : 'N/A'}
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
                  title="Total Revenue (25 years)"
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
                  title="Annual Solar Savings"
                  value={formatCurrency(financialMetrics.annualSolarSavings)}
                  icon={<Sun className="h-6 w-6 text-yellow-500" />}
                  tooltip={`The Annual Solar Savings are ${formatCurrency(financialMetrics.annualSolarSavings)}. This represents the yearly savings on electricity costs due to solar production. It's calculated as: Annual Solar Production (kWh) × Baseline Electricity Rate ($/kWh)`}
                />
                <MetricCard
                  title="Annual SREC Revenue"
                  value={formatCurrency(financialMetrics.annualSrecRevenue)}
                  icon={<Award className="h-6 w-6 text-purple-500" />}
                  tooltip={`The Annual SREC Revenue is ${formatCurrency(financialMetrics.annualSrecRevenue)}. This is the yearly income from selling Solar Renewable Energy Credits. It's calculated as: (Annual Solar Production / 1000) × SREC Price. Note that SREC prices can vary by location and market conditions.`}
                />
              </div>
              {/* Add Cash Flow Projection Chart here if needed */}
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Table */}
        {financialMetrics.cashFlows && financialMetrics.cashFlows.length > 0 && (
          <CashFlowTable
            cashFlows={financialMetrics.cashFlows}
            initialInvestment={netProjectCost}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
