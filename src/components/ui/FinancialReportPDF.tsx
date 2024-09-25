import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30 },
  section: { margin: 10, padding: 10 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  subtitle: { fontSize: 18, marginBottom: 10 },
  text: { fontSize: 12, marginBottom: 5 },
  table: { display: 'table', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0 },
  tableRow: { margin: 'auto', flexDirection: 'row' },
  tableCol: { width: '25%', borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0 },
  tableCell: { margin: 'auto', marginTop: 5, fontSize: 10 },
  metricCard: { width: '50%', marginBottom: 10, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5 },
  metricTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  metricValue: { fontSize: 12 },
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', color: 'grey', fontSize: 10 },
});

const formatCurrency = (value) => `$${value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;

const formatPercentage = (value) => `${value.toFixed(2)}%`;

const formatIRRandROI = (value) => {
  // Assuming the value is passed as a percentage (e.g., 45.06 for 45.06%)
  return `${value.toFixed(2)}%`;
};

const MetricCard = ({ title, value }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const FinancialReportPDF = ({ financialMetrics, cashFlows, evDetails, solarSystem }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>EV Charging Station and Solar System Financial Report</Text>
      
      <View style={styles.section}>
        <Text style={styles.subtitle}>Project Overview</Text>
        <Text style={styles.text}>Number of EV Stations: {evDetails.numStations}</Text>
        <Text style={styles.text}>Solar System Size: {solarSystem.systemSize} kW</Text>
        <Text style={styles.text}>Total Project Cost: {formatCurrency(financialMetrics.totalProjectCost)}</Text>
        <Text style={styles.text}>Net Project Cost (After Incentives): {formatCurrency(financialMetrics.netProjectCost)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Key Financial Metrics</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <MetricCard title="Internal Rate of Return (IRR)" value={formatIRRandROI(financialMetrics.irr)} />
          <MetricCard title="Net Present Value (NPV)" value={formatCurrency(financialMetrics.npv)} />
          <MetricCard title="Payback Period" value={`${financialMetrics.paybackPeriod.toFixed(2)} years`} />
          <MetricCard title="Return on Investment (ROI)" value={formatIRRandROI(financialMetrics.roi)} />
          <MetricCard title="Total Revenue (20 years)" value={formatCurrency(financialMetrics.totalRevenue)} />
          <MetricCard title="Annual EV Revenue" value={formatCurrency(financialMetrics.annualEvRevenue)} />
        </View>
      </View>

      <Text style={styles.footer}>Page 1 of 2</Text>
    </Page>

    <Page size="A4" style={styles.page}>
      <Text style={styles.subtitle}>Cash Flow Summary</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
          <View style={styles.tableCol}><Text style={styles.tableCell}>Year</Text></View>
          <View style={styles.tableCol}><Text style={styles.tableCell}>EV Revenue</Text></View>
          <View style={styles.tableCol}><Text style={styles.tableCell}>Total Expenses</Text></View>
          <View style={styles.tableCol}><Text style={styles.tableCell}>Cash Flow</Text></View>
        </View>
        {cashFlows.slice(0, 10).map((flow, index) => (
          <View style={styles.tableRow} key={flow.year}>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{flow.year}</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{formatCurrency(flow.evRevenue)}</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{formatCurrency(flow.gridCost + flow.maintenanceCost + flow.loanPayment)}</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{formatCurrency(flow.cashFlow)}</Text></View>
          </View>
        ))}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.text}>Note: This table shows the first 10 years of cash flows. The project is modeled for a total of 20 years.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Investment Highlights</Text>
        <Text style={styles.text}>• Positive NPV of {formatCurrency(financialMetrics.npv)} indicates a profitable investment.</Text>
        <Text style={styles.text}>• Strong IRR of {formatIRRandROI(financialMetrics.irr)} exceeds typical hurdle rates.</Text>
        <Text style={styles.text}>• Payback period of {financialMetrics.paybackPeriod.toFixed(2)} years shows quick return on investment.</Text>
        <Text style={styles.text}>• Substantial ROI of {formatIRRandROI(financialMetrics.roi)} over the project lifetime.</Text>
      </View>

      <Text style={styles.footer}>Page 2 of 2</Text>
    </Page>
  </Document>
);

export default FinancialReportPDF;