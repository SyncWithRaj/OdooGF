'use client';

import { useState } from 'react';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ExportActions({
  reportTitle = 'Sales Performance Report',
  reportRole = 'Admin',
  dateRangeText = 'All Time',
  kpis = [],
  tables = [],
}) {
  const [exporting, setExporting] = useState(false);

  // 1. Client-side PDF Export
  const handleExportPdf = async () => {
    try {
      setExporting(true);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const nowStr = new Date().toLocaleString();

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 80, 'F');

      doc.setTextColor(52, 211, 153); // emerald-400
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('DealFlow360', 40, 42);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(reportTitle, 40, 64);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Role: ${reportRole.toUpperCase()} | Generated: ${nowStr} | Range: ${dateRangeText}`, 40, 100);

      // KPI Metric Cards
      let currentY = 120;
      if (kpis.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Key Performance Indicators', 40, currentY);
        currentY += 15;

        const cardWidth = 118;
        const cardHeight = 44;
        kpis.slice(0, 4).forEach((kpi, idx) => {
          const x = 40 + idx * (cardWidth + 12);
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(x, currentY, cardWidth, cardHeight, 4, 4, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(x, currentY, cardWidth, cardHeight, 4, 4, 'S');

          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(kpi.label, x + 8, currentY + 16);

          doc.setFontSize(13);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(String(kpi.value), x + 8, currentY + 34);
        });
        currentY += cardHeight + 25;
      }

      // Render Tables
      tables.forEach((table, tIndex) => {
        if (table.headers && table.rows && table.rows.length > 0) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(table.title || `Data Table ${tIndex + 1}`, 40, currentY);
          currentY += 10;

          doc.autoTable({
            head: [table.headers],
            body: table.rows,
            startY: currentY,
            margin: { left: 40, right: 40 },
            theme: 'grid',
            headStyles: {
              fillColor: [16, 185, 129], // emerald-500
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 8.5,
            },
            bodyStyles: {
              fontSize: 8,
              textColor: [51, 65, 85],
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252],
            },
          });

          currentY = doc.lastAutoTable.finalY + 25;
        }
      });

      // Save PDF
      const sanitizedName = reportTitle.toLowerCase().replace(/\s+/g, '_');
      doc.save(`DealFlow360_${sanitizedName}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Check console for details.');
    } finally {
      setExporting(false);
    }
  };

  // 2. Client-side XLS Export
  const handleExportXls = () => {
    try {
      setExporting(true);
      const wb = XLSX.utils.book_new();

      // Sheet 1: KPIs & Metadata
      const summaryRows = [
        ['DealFlow360 - Sales Performance Export'],
        ['Report Title', reportTitle],
        ['Role View', reportRole],
        ['Date Range', dateRangeText],
        ['Exported At', new Date().toISOString()],
        [],
        ['KEY PERFORMANCE INDICATORS'],
        ...kpis.map((k) => [k.label, k.value]),
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Subsequent Sheets: Data Tables
      tables.forEach((table, index) => {
        if (table.headers && table.rows) {
          const sheetData = [table.headers, ...table.rows];
          const ws = XLSX.utils.aoa_to_sheet(sheetData);
          const sheetName = (table.sheetName || table.title || `Data_${index + 1}`).slice(0, 30);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      });

      const sanitizedName = reportTitle.toLowerCase().replace(/\s+/g, '_');
      XLSX.writeFile(wb, `DealFlow360_${sanitizedName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('XLS export failed:', err);
      alert('Failed to generate XLS. Check console for details.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleExportPdf}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm"
        title="Download executive PDF summary"
      >
        <FileText className="w-3.5 h-3.5" />
        Export PDF
      </button>

      <button
        type="button"
        onClick={handleExportXls}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm"
        title="Download structured Excel spreadsheet"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Export XLS
      </button>
    </div>
  );
}
