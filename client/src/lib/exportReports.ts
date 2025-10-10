import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

export const exportExamResultsCSV = (candidates: any[]) => {
  const data = candidates.map(c => ({
    'Candidate Name': c.user?.firstName && c.user?.lastName 
      ? `${c.user.firstName} ${c.user.lastName}`
      : c.user?.email || 'Unknown',
    'Email': c.user?.email || 'N/A',
    'Exam': c.exam?.title || 'N/A',
    'Status': c.status,
    'Score': c.score !== null ? `${c.score}%` : 'N/A',
    'Started At': c.startedAt ? new Date(c.startedAt).toLocaleString() : 'N/A',
    'Completed At': c.completedAt ? new Date(c.completedAt).toLocaleString() : 'N/A',
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `exam_results_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportProctorLogsCSV = (logs: any[]) => {
  const data = logs.map(log => ({
    'Candidate': log.candidate?.user?.email || 'Unknown',
    'Exam': log.candidate?.exam?.title || 'Unknown',
    'Event Type': log.eventType,
    'Severity': log.severity,
    'Timestamp': new Date(log.timestamp).toLocaleString(),
    'Metadata': log.metadata ? JSON.stringify(log.metadata) : '',
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `proctor_logs_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportExamResultsPDF = (candidates: any[]) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text('Exam Results Report', 14, 15);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
  
  // Prepare table data
  const tableData = candidates.map(c => [
    c.user?.firstName && c.user?.lastName 
      ? `${c.user.firstName} ${c.user.lastName}`
      : c.user?.email || 'Unknown',
    c.exam?.title || 'N/A',
    c.status,
    c.score !== null ? `${c.score}%` : 'N/A',
    c.completedAt ? new Date(c.completedAt).toLocaleDateString() : 'N/A',
  ]);
  
  // Add table
  autoTable(doc, {
    head: [['Candidate', 'Exam', 'Status', 'Score', 'Completed']],
    body: tableData,
    startY: 30,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });
  
  doc.save(`exam_results_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportProctorLogsPDF = (logs: any[]) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text('Proctoring Logs Report', 14, 15);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
  
  // Prepare table data
  const tableData = logs.map(log => [
    log.candidate?.user?.email || 'Unknown',
    log.eventType,
    log.severity,
    new Date(log.timestamp).toLocaleString(),
  ]);
  
  // Add table
  autoTable(doc, {
    head: [['Candidate', 'Event Type', 'Severity', 'Timestamp']],
    body: tableData,
    startY: 30,
    theme: 'grid',
    headStyles: { fillColor: [192, 57, 43] },
  });
  
  doc.save(`proctor_logs_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportAnalyticsCSV = (analytics: any) => {
  const data = [
    { metric: 'Total Exams', value: analytics.totalExams },
    { metric: 'Active Exams', value: analytics.activeExams },
    { metric: 'Total Candidates', value: analytics.totalCandidates },
    { metric: 'Completed Candidates', value: analytics.completedCandidates },
    { metric: 'Average Score', value: `${analytics.averageScore?.toFixed(1)}%` },
    { metric: 'Total Violations', value: analytics.totalViolations },
    { metric: 'High Severity Violations', value: analytics.highSeverityViolations },
  ];

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportAnalyticsPDF = (analytics: any) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text('Analytics Report', 14, 15);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
  
  // Summary statistics
  doc.setFontSize(14);
  doc.text('Summary Statistics', 14, 40);
  
  doc.setFontSize(10);
  doc.text(`Total Exams: ${analytics.totalExams}`, 20, 50);
  doc.text(`Active Exams: ${analytics.activeExams}`, 20, 57);
  doc.text(`Total Candidates: ${analytics.totalCandidates}`, 20, 64);
  doc.text(`Completed Candidates: ${analytics.completedCandidates}`, 20, 71);
  doc.text(`Average Score: ${analytics.averageScore?.toFixed(1)}%`, 20, 78);
  doc.text(`Total Violations: ${analytics.totalViolations}`, 20, 85);
  doc.text(`High Severity Violations: ${analytics.highSeverityViolations}`, 20, 92);
  
  // Exam Performance Table
  if (analytics.examPerformance && analytics.examPerformance.length > 0) {
    doc.setFontSize(14);
    doc.text('Exam Performance', 14, 110);
    
    const tableData = analytics.examPerformance.map((exam: any) => [
      exam.title,
      exam.totalCandidates.toString(),
      exam.completed.toString(),
      exam.avgScore?.toFixed(1) + '%',
      exam.passRate?.toFixed(1) + '%',
      exam.violations.toString(),
    ]);
    
    autoTable(doc, {
      head: [['Exam', 'Candidates', 'Completed', 'Avg Score', 'Pass Rate', 'Violations']],
      body: tableData,
      startY: 115,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });
  }
  
  doc.save(`analytics_report_${new Date().toISOString().split('T')[0]}.pdf`);
};
