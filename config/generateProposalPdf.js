const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function generateProposalPdf(enquiryData) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const logoBytes = fs.readFileSync(path.join(__dirname, 'logo.png'));
  const logoImage = await pdfDoc.embedPng(logoBytes);

  const addPageWithText = (textLines = [], options = {}) => {
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { x = 50, yStart = 750, lineGap = 25, fontSize = 16, color = rgb(0, 0, 0) } = options;
    let y = yStart;

    // ✨ Add watermark logo
    const { width, height } = page.getSize();
    const logoDims = logoImage.scale(0.2);
    page.drawImage(logoImage, {
      x: width - logoDims.width - 30,
      y: height - logoDims.height - 30,
      width: logoDims.width,
      height: logoDims.height,
      opacity: 0.15,
    });

    // 🖋️ Draw text content
    textLines.forEach(line => {
      page.drawText(line, { x, y, size: fontSize, font, color });
      y -= lineGap;
    });
  };

  // 1️⃣ Welcome Page
  addPageWithText([
    ' Welcome to Gobind Coach Builders',
    '',
    'Your Custom Bus Journey Starts Here!',
    '',
    'We’re thrilled to begin this journey with you.',
  ], { fontSize: 22, lineGap: 30, yStart: 700 });

  // 2️⃣ Enquiry Details Page
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
  addPageWithText(['📋 Proposal Details', '', ...fields], { fontSize: 16, yStart: 760 });

  // 3️⃣ Empty Page Placeholder
  const emptyPage = pdfDoc.addPage([595, 842]);
  const emptyWidth = emptyPage.getWidth();
  const emptyHeight = emptyPage.getHeight();
  emptyPage.drawText('This page is intentionally left blank.', {
    x: emptyWidth / 2 - 130,
    y: emptyHeight / 2,
    size: 14,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // 4️⃣ Thank You Page
  addPageWithText([
    ' Thank You!',
    '',
    'We look forward to building your dream bus.',
    '',
    '-- Team Gobind Coach Builders --',
  ], { fontSize: 20, yStart: 700, lineGap: 35 });

  // Save PDF as Uint8Array
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = generateProposalPdf;
