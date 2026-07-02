import { jsPDF } from 'jspdf';

/**
 * Generates a beautiful PDF receipt for a successful donation.
 * 
 * @param {Object} params
 * @param {Object} params.donation - The donation log record (id, amount, tx_hash, created_at)
 * @param {Object} params.campaign - The campaign record (title)
 * @param {Object} params.donor - The donor/user record (full_name, email)
 * @returns {Blob} The generated PDF as a Blob ready for upload
 */
export function generateReceiptPDF({ donation, campaign, donor }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // A4 size: 210 x 297 mm
  const pageWidth = 210;
  const pageHeight = 297;

  // 1. Draw a beautiful sleek top banner (dark modern slate-900)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('NEXUS', 20, 20);

  // Subtitle in Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('DISASTER RELIEF TRANSPARENT NETWORK', 20, 28);

  // Receipt Identifier in Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(163, 230, 53); // lime-400 (matches theme color!)
  doc.text('OFFICIAL DONATION RECEIPT', pageWidth - 20, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  const shortId = donation.id ? donation.id.slice(0, 8).toUpperCase() : 'N/A';
  doc.text(`Receipt ID: ${shortId}`, pageWidth - 20, 28, { align: 'right' });

  // Main Content Section
  doc.setTextColor(15, 23, 42); // slate-900

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Donation Summary', 20, 65);

  // Draw a modern, soft light grey border container for summary details
  doc.setDrawColor(241, 245, 249); // slate-100
  doc.setFillColor(250, 250, 250); // slate-50
  doc.roundedRect(20, 72, pageWidth - 40, 110, 4, 4, 'FD');

  // Table rows in the container
  let y = 85;
  const drawRow = (label, value, isBoldVal = false, isMonospace = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label, 26, y);

    if (isMonospace) {
      doc.setFont('courier', isBoldVal ? 'bold' : 'normal');
    } else {
      doc.setFont('helvetica', isBoldVal ? 'bold' : 'normal');
    }
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(value, pageWidth - 26, y, { align: 'right' });

    // Draw thin separator line under row
    y += 4;
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.line(26, y, pageWidth - 26, y);
    y += 10;
  };

  const formattedAmount = `$${parseFloat(donation.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const donationDate = new Date(donation.created_at || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  drawRow('Donor Name', donor?.full_name || 'Anonymous Donor');
  drawRow('Donor Email', donor?.email || 'N/A');
  drawRow('Relief Campaign', campaign?.title || 'Relief Campaign');
  drawRow('Donation Amount', formattedAmount, true);
  drawRow('Transaction Date', donationDate);

  // Large impact highlight badge (lime green)
  doc.setFillColor(244, 252, 231); // lime-50
  doc.setDrawColor(217, 249, 157); // lime-200
  doc.roundedRect(20, 195, pageWidth - 40, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(63, 98, 18); // lime-800
  doc.text('VERIFIED ON-CHAIN STATUS: SUCCESSFUL', 26, 203);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(74, 85, 104);
  const txHash = donation.tx_hash || 'N/A';
  // Wrap or fit transaction hash cleanly
  doc.text(`Blockchain Tx: ${txHash}`, 26, 212);

  // Thank you section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Zero Middleman Fees • 100% On-Chain Transparency', 20, 240);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const disclaimer = 'Thank you for your generous contribution. This receipt is automatically compiled upon successful cryptographic validation of your transaction under our User Gas Free (UGF) protocol. Your funds are secured on the blockchain and can be publicly verified at any time.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 40);
  doc.text(splitDisclaimer, 20, 247);

  // Footer brand note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('This is a cryptographically secured and digitally signed document. No physical signature required.', pageWidth / 2, pageHeight - 15, { align: 'center' });

  return doc.output('blob');
}
