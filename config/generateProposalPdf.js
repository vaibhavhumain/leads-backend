const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function generateProposalPdf(enquiryData) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const addPageWithText = (textLines = [], options = {}) => {
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { x = 50, yStart = 750, lineGap = 25, fontSize = 16, color = rgb(0, 0, 0) } = options;
    let y = yStart;

    textLines.forEach(line => {
      page.drawText(line, { x, y, size: fontSize, font, color });
      y -= lineGap;
    });
  };

  // 1️⃣ Welcome Page
  addPageWithText([
    'Welcome to Gobind Coach Builders',
    'Your Custom Bus Journey Starts Here!',
  ], { fontSize: 24 });

  // 2️⃣ Enquiry Details Page (select key fields)
  const fields = [
    `Client Name: ${enquiryData.customerName}`,
    `Phone: ${enquiryData.customerPhone}`,
    `Email: ${enquiryData.customerEmail}`,
    `City: ${enquiryData.city}`,
    `Bus Type: ${enquiryData.busType}`,
    `Feature Requirement: ${enquiryData.featureRequirement}`,
    `Chassis Model: ${enquiryData.chassisModel}`,
    `Seating Pattern: ${enquiryData.seatingPattern}`,
    `Total Seats: ${enquiryData.totalSeats}`,
  ];
  addPageWithText(['Proposal Details', '', ...fields]);

  // 3️⃣ Empty Page (placeholder)
  pdfDoc.addPage([595, 842]);

  // 4️⃣ Thank You Page
  addPageWithText([
    'Thank You!',
    'We look forward to building your dream bus.',
    '',
    'Team Gobind Coach Builders',
  ], { fontSize: 20 });

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = generateProposalPdf;
