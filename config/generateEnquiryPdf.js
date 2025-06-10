const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function generateEnquiryPdf(enquiry) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 12;
  let y = height - 50;

  // --- 1. Embed logo image (used for both small logo and watermark) ---
  const logoPath = path.resolve(__dirname, 'logo.png'); // Use .jpg if that's your logo
  let logo, logoDims;
  try {
    const logoImage = fs.readFileSync(logoPath);
    logo = await pdfDoc.embedPng(logoImage); // embedJpg if your logo is JPG

    // --- 2. Draw watermark logo (centered, large, transparent) ---
    const wmWidth = width * 0.7;
    const wmHeight = logo.height * (wmWidth / logo.width);
    page.drawImage(logo, {
      x: (width - wmWidth) / 2,
      y: (height - wmHeight) / 2,
      width: wmWidth,
      height: wmHeight,
      opacity: 0.13, // transparent!
    });

    // --- 3. Draw small logo at top left (optional) ---
    const smallDims = logo.scale(0.18);
    page.drawImage(logo, {
      x: 40,
      y: height - 60,
      width: smallDims.width,
      height: smallDims.height,
    });
    y = height - 90;
  } catch (e) {
    console.warn('Logo image not found or failed to embed:', e.message);
    y = height - 50;
  }

  // --- Header ---
  page.drawRectangle({
    x: 0, y: y + 15, width,
    height: 40, color: rgb(0.05, 0.24, 0.55),
  });
  page.drawText('GOBIND COACH BUILDERS', {
    x: 50, y: y + 25, size: 22, font: boldFont, color: rgb(1, 1, 1),
  });
  page.drawText('Enquiry Form', {
    x: width - 180, y: y + 25, size: 16, font: boldFont, color: rgb(1, 1, 1),
  });

  y -= 35;

  // Helper: Draw section header
  function section(title) {
    y -= 30;
    page.drawRectangle({
      x: 30, y: y + 8, width: width - 60, height: 24,
      color: rgb(0.87, 0.92, 1)
    });
    page.drawText(title, {
      x: 38, y: y + 12,
      size: 14, font: boldFont, color: rgb(0.09, 0.33, 0.68),
    });
    y -= 6;
  }

  // Helper: Draw a label and value
  function field(label, value) {
    if (y < 60) { y = height - 70; page = pdfDoc.addPage(); }
    page.drawText(`${label}:`, {
      x: 42, y, size: fontSize, font: boldFont, color: rgb(0.18, 0.18, 0.18)
    });
    page.drawText(`${value || '-'}`, {
      x: 160, y, size: fontSize, font, color: rgb(0.18, 0.18, 0.18)
    });
    y -= 18;
  }

  // --- BASIC INFO ---
  section('Basic Information');
  field('Enquiry ID', enquiry.enquiryId);
  field('Team Member', enquiry.teamMember);
  field('Customer Name', enquiry.customerName);
  field('Company', enquiry.companyDetails);
  field('Phone', enquiry.customerPhone);
  field('Email', enquiry.customerEmail);
  field('Address', `${enquiry.address || ''} ${enquiry.city || ''}, ${enquiry.state || ''} - ${enquiry.pincode || ''}`);

  // --- BUSINESS/PERSONAL INFO ---
  section('Business & Personal Details');
  field('Type of Buses in Fleet', enquiry.businessTypeOfBuses);
  field('No. of Buses', enquiry.businessNumberOfBuses);
  field('Previous Body Builder', enquiry.businessPreviousBodyBuilder);
  field('Buses per Year', enquiry.businessBusesPerYear);
  field('Employees', enquiry.businessEmployees);
  field('Expertise Area', enquiry.businessExpertiseArea);
  field('Education', enquiry.education);
  field('Hobbies', enquiry.hobbies);
  field('Behavior', enquiry.behavior);
  field('Customer Type', enquiry.customerType);

  // --- BUS REQUIREMENT ---
  section('Bus Requirement');
  field('Bus Type', enquiry.busType);
  field('Other Bus Type', enquiry.otherBusType);
  field('Feature Requirement', enquiry.featureRequirement);
  field('AC Preference', enquiry.acPreference);
  field('Referral Source', enquiry.referralSource);

  // --- CHASSIS INFO ---
  section('Chassis & Dimensions');
  field('Chassis Bought', enquiry.chassisBought);
  field('Chassis Purchase Time', enquiry.chassisPurchaseTime);
  field('Chassis Company', enquiry.chassisCompanyName);
  field('Chassis Model', enquiry.chassisModel);
  field('Wheel Base', enquiry.wheelBase);
  field('Tyre Size', enquiry.tyreSize);
  field('Length', enquiry.length);
  field('Width', enquiry.width);

  // --- SEATING ---
  section('Seating');
  field('Seating Pattern', enquiry.seatingPattern);
  field('Number of Seats', enquiry.numberOfSeats);
  field('Total Seats', enquiry.totalSeats);

  // --- LUXURY / FITMENT ---
  section('Luxury / Fitment');
  field('Window Type', enquiry.windowType);
  field('Required No Each Side', enquiry.requiredNoEachSide);
  field('Tint of Shades', enquiry.tintOfShades);
  field('Other Tint', enquiry.otherTint);
  field('Seat Type', enquiry.seatType);
  field('Seat Material', enquiry.seatMaterial);
  field('Curtain', enquiry.curtain);
  field('Flooring Type', enquiry.flooringType);
  field('Passenger Doors', enquiry.passengerDoors);
  field('Passenger Door Position', enquiry.passengerDoorPosition);
  field('Door Type', enquiry.doorType);
  field('Roof Carrier', enquiry.roofCarrier);
  field('Diggy Type', enquiry.diggyType);
  field('Side Luggage Required', enquiry.sideLuggageReq);
  field('Diggy Flooring', enquiry.diggyFlooring);
  field('Side Ladder', enquiry.sideLadder);
  field('Helper Foot Step', enquiry.helperFootStep);
  field('Rear Back Jaal', enquiry.rearBackJaal);
  field('Cabin Type', enquiry.cabinType);
  field('Specific Requirement', enquiry.specificRequirement);
  field('Suggested Model', enquiry.suggestedModel);
  field('Seat Belt', enquiry.seatBelt);
  field('Seat Belt Type', enquiry.seatBeltType);

  // --- ARRAYS / EXTRAS ---
  section('Features & Fitments');
  field('Optional Features', (enquiry.optionalFeatures || []).join(', '));
  field('Fitment Provided', (enquiry.fitmentProvided || []).join(', '));

  // --- NOTES ---
  section('Additional Notes');
  field('Note', enquiry.additionalNote);

  // --- Footer ---
  y -= 20;
  page.drawLine({
    start: { x: 35, y }, end: { x: width - 35, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8)
  });
  page.drawText('Generated by Gobind Coach Builders Enquiry System', {
    x: 40, y: y - 15, size: 10, font, color: rgb(0.5, 0.5, 0.5),
  });

  // Output PDF
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = generateEnquiryPdf;
