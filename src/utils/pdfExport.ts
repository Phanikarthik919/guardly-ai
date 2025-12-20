import jsPDF from 'jspdf';
import { AuditReport, ComplianceResult, Transaction, ParsedClause } from '@/contexts/PipelineContext';

interface ExportData {
  report: AuditReport;
  complianceResults: ComplianceResult[];
  transactions: Transaction[];
  parsedClauses: ParsedClause[];
}

export function exportAuditReportToPdf({ report, complianceResults, transactions, parsedClauses }: ExportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Helper function to add page break if needed
  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > 270) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('ReguGuard AI', 15, 18);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Compliance Audit Report', 15, 28);
  
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, 15, 36);

  yPos = 55;
  doc.setTextColor(0, 0, 0);

  // Executive Summary
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 15, yPos);
  yPos += 10;

  // Summary Stats
  const stats = [
    { label: 'Total Checked', value: report.summary.totalChecked, color: [59, 130, 246] },
    { label: 'Compliant', value: report.summary.compliant, color: [34, 197, 94] },
    { label: 'Violations', value: report.summary.violations, color: [239, 68, 68] },
    { label: 'Warnings', value: report.summary.warnings, color: [245, 158, 11] },
  ];

  const boxWidth = 42;
  const boxHeight = 25;
  const startX = 15;

  stats.forEach((stat, index) => {
    const x = startX + (index * (boxWidth + 5));
    
    doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 3, 3, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(String(stat.value), x + boxWidth / 2, yPos + 12, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label, x + boxWidth / 2, yPos + 20, { align: 'center' });
  });

  yPos += boxHeight + 15;
  doc.setTextColor(0, 0, 0);

  // Compliance Rate
  const complianceRate = report.summary.totalChecked > 0 
    ? Math.round((report.summary.compliant / report.summary.totalChecked) * 100) 
    : 0;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Overall Compliance Rate: ${complianceRate}%`, 15, yPos);
  yPos += 15;

  // Summary Text
  doc.setFontSize(10);
  const summaryText = `This audit reviewed ${report.summary.totalChecked} compliance check(s). ` +
    (report.summary.violations > 0 ? `${report.summary.violations} violation(s) require immediate attention. ` : '') +
    (report.summary.warnings > 0 ? `${report.summary.warnings} warning(s) should be monitored. ` : '') +
    (report.summary.compliant === report.summary.totalChecked ? 'All items are compliant.' : '');
  
  const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 30);
  doc.text(splitSummary, 15, yPos);
  yPos += splitSummary.length * 5 + 15;

  // Detailed Findings
  checkPageBreak(30);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Findings', 15, yPos);
  yPos += 10;

  report.details.forEach((detail, index) => {
    checkPageBreak(50);
    
    const result = complianceResults.find(r => r.id === detail.complianceResultId);
    const tx = result ? transactions.find(t => t.id === result.transactionId) : null;
    
    // Finding card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, yPos, pageWidth - 30, 45, 2, 2, 'F');
    
    // Status badge
    const statusColors: Record<string, number[]> = {
      compliant: [34, 197, 94],
      violation: [239, 68, 68],
      warning: [245, 158, 11],
      missing_docs: [156, 163, 175],
    };
    const statusColor = result ? statusColors[result.status] || [156, 163, 175] : [156, 163, 175];
    
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(20, yPos + 5, 30, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text((result?.status || 'unknown').toUpperCase(), 35, yPos + 9, { align: 'center' });
    
    // Clause reference
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Clause: ${detail.clauseReference}`, 55, yPos + 10);
    
    // Transaction info
    if (tx) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Transaction: ${tx.vendor} - ${tx.amount}`, 55, yPos + 16);
    }
    
    // Reasoning
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const reasoningText = doc.splitTextToSize(`Reasoning: ${detail.reasoning}`, pageWidth - 45);
    doc.text(reasoningText.slice(0, 2), 20, yPos + 25);
    
    // Corrective action
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    const actionText = doc.splitTextToSize(`Action: ${detail.correctiveAction}`, pageWidth - 45);
    doc.text(actionText.slice(0, 2), 20, yPos + 38);
    
    yPos += 50;
  });

  // Footer on last page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | ReguGuard AI Compliance Platform`,
      pageWidth / 2,
      285,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`audit-report-${report.generatedAt.split('T')[0]}.pdf`);
}
