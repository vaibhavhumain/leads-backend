const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function generateEnquiryPdf(enquiry) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  let y = height - 40;

  const drawText = (label, value) => {
    page.drawText(`${label}: ${value || '-'}`, {
      x: 40,
      y: y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 20;
    if (y < 50) {
      y = height - 40;
      pdfDoc.addPage(); // add new page if needed
    }
  };

  // Metadata
  drawText('Enquiry ID', enquiry.enquiryId);
  drawText('Team Member', enquiry.teamMember);
  drawText('Customer Name', enquiry.customerName);
  drawText('Phone', enquiry.customerPhone);
  drawText('Email', enquiry.customerEmail);
  drawText('Bus Type', enquiry.busType);
  drawText('Feature Requirement', enquiry.featureRequirement);
  drawText('AC Preference', enquiry.acPreference);

  // Chassis Info
  drawText('Chassis Bought', enquiry.chassisBought);
  drawText('Chassis Company', enquiry.chassisCompanyName);
  drawText('Chassis Model', enquiry.chassisModel);
  drawText('Wheel Base', enquiry.wheelBase);
  drawText('Tyre Size', enquiry.tyreSize);
  drawText('Length', enquiry.length);
  drawText('Width', enquiry.width);

  // Luxury Fields
  drawText('Window Type', enquiry.windowType);
  drawText('Tint of Shades', enquiry.tintOfShades);
  drawText('Seat Type', enquiry.seatType);
  drawText('Seat Material', enquiry.seatMaterial);
  drawText('Flooring Type', enquiry.flooringType);
  drawText('Curtain', enquiry.curtain);
  drawText('Cabin Type', enquiry.cabinType);
  drawText('Specific Requirement', enquiry.specificRequirement);
  drawText('Suggested Model', enquiry.suggestedModel);

  // Optional & Fitments (Array Fields)
  drawText('Optional Features', (enquiry.optionalFeatures || []).join(', '));
  drawText('Fitment Provided', (enquiry.fitmentProvided || []).join(', '));

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = generateEnquiryPdf;
