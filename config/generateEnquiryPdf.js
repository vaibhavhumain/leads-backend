// backend/config/generateEnquiryPdf.js
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

  // === Logo ===
  const logoPath = path.resolve(__dirname, 'logo.png');
  try {
    const logoImage = fs.readFileSync(logoPath);
    const logo = await pdfDoc.embedPng(logoImage);

    // watermark
    const wmWidth = width * 0.7;
    const wmHeight = logo.height * (wmWidth / logo.width);
    page.drawImage(logo, {
      x: (width - wmWidth) / 2,
      y: (height - wmHeight) / 2,
      width: wmWidth,
      height: wmHeight,
      opacity: 0.13,
    });

    // small logo top-left
    const small = logo.scale(0.18);
    page.drawImage(logo, { x: 40, y: height - 60, width: small.width, height: small.height });
    y = height - 90;
  } catch {
    console.warn('⚠️ Logo not found, skipping logo embedding');
    y = height - 50;
  }

  // === Helpers ===
  function newPageIfNeeded() {
    if (y < 60) {
      page = pdfDoc.addPage();
      y = height - 70;
    }
  }

  function section(title) {
    y -= 30;
    newPageIfNeeded();
    page.drawRectangle({ x: 30, y: y + 8, width: width - 60, height: 24, color: rgb(0.87, 0.92, 1) });
    page.drawText(title, { x: 38, y: y + 12, size: 14, font: boldFont, color: rgb(0.09, 0.33, 0.68) });
    y -= 6;
  }

  function field(label, value) {
    newPageIfNeeded();
    page.drawText(`${label}:`, { x: 42, y, size: fontSize, font: boldFont, color: rgb(0.18, 0.18, 0.18) });
    page.drawText(`${value || '-'}`, { x: 160, y, size: fontSize, font, color: rgb(0.18, 0.18, 0.18) });
    y -= 18;
  }

  function listField(label, arr = []) {
    field(label, (arr && arr.length) ? arr.join(', ') : '-');
  }

  // === Basic Info ===
  section('Basic Information');
  field('Enquiry ID', enquiry.enquiryId);
  field('Team Member', enquiry.teamMember);
  field('Customer Name', enquiry.customerName);
  field('Company', enquiry.companyDetails);
  field('Phone', enquiry.customerPhone);
  field('Email', enquiry.customerEmail);
  field('Address', `${enquiry.address || ''} ${enquiry.city || ''}, ${enquiry.state || ''} - ${enquiry.pincode || ''}`);

  // === Business & Personal ===
  section('Business & Personal');
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

  // === Requirement ===
  section('Bus Requirement');
  field('Bus Type', enquiry.busType);
  field('Other Bus Type', enquiry.otherBusType);
  field('Feature Requirement', enquiry.featureRequirement);
  field('AC Preference', enquiry.acPreference);
  field('Referral Source', enquiry.referralSource);

  // === Chassis ===
  section('Chassis & Dimensions');
  field('Chassis Bought', enquiry.chassisBought);
  field('Purchase Time', enquiry.chassisPurchaseTime);
  field('Company', enquiry.chassisCompanyName);
  field('Model', enquiry.chassisModel);
  field('Wheel Base', enquiry.wheelBase);
  field('Tyre Size', enquiry.tyreSize);
  field('Length', enquiry.length);
  field('Width', enquiry.width);

  // === Seating ===
  section('Seating');
  field('Seating Pattern', enquiry.seatingPattern);
  field('Number of Seats', enquiry.numberOfSeats);
  field('Total Seats', enquiry.totalSeats);

  // === Luxury ===
  section('Luxury / Fitment');
  field('Window Type', enquiry.windowType);
  field('Required No Each Side', enquiry.requiredNoEachSide);
  field('Tint of Shades', enquiry.tintOfShades);
  field('Seat Type', enquiry.seatType);
  field('Seat Material', enquiry.seatMaterial);
  field('Curtain', enquiry.curtain);
  field('Flooring Type', enquiry.flooringType);
  field('Passenger Doors', enquiry.passengerDoors);
  field('Door Position', enquiry.passengerDoorPosition);
  field('Door Type', enquiry.doorType);
  field('Roof Carrier', enquiry.roofCarrier);
  field('Diggy Type', enquiry.diggyType);
  field('Side Luggage', enquiry.sideLuggageReq);
  field('Side Ladder', enquiry.sideLadder);
  field('Helper Foot Step', enquiry.helperFootStep);
  field('Rear Back Jaal', enquiry.rearBackJaal);
  field('Cabin Type', enquiry.cabinType);
  field('Specific Requirement', enquiry.specificRequirement);
  field('Suggested Model', enquiry.suggestedModel);
  field('Seat Belt', enquiry.seatBelt);
  field('Seat Belt Type', enquiry.seatBeltType);

  // === Fitments ===
  if (Array.isArray(enquiry.standardFitments) && enquiry.standardFitments.length > 0) {
    section('Standard Fitments');
    enquiry.standardFitments.forEach((fit, idx) => {
      field(`${idx + 1}. ${fit.label || fit.key}`, `Suggested: ${fit.suggested || '-'}, Choice: ${fit.choice || '-'}, Other: ${fit.otherValue || '-'}`);
    });
  }

  if (Array.isArray(enquiry.optionalFitmentsSelected) && enquiry.optionalFitmentsSelected.length > 0) {
    section('Optional Fitments');
    enquiry.optionalFitmentsSelected.forEach((fit, idx) => {
      field(`${idx + 1}.`, fit);
    });
  }

  if (Array.isArray(enquiry.extraCostFitments) && enquiry.extraCostFitments.length > 0) {
    section('Extra-cost Fitments');
    enquiry.extraCostFitments.forEach((fit, idx) => {
      field(`${idx + 1}. ${fit.label || fit.key}`, fit.company || '-');
    });
  }

  if (Array.isArray(enquiry.customExtras) && enquiry.customExtras.length > 0) {
    section('Custom Extras');
    enquiry.customExtras.forEach((extra, idx) => {
      field(`${idx + 1}. ${extra.name || '-'}`, extra.desc || '-');
    });
  }

  // === Other Features ===
  section('Features & Extras');
  listField('Optional Features', enquiry.optionalFeatures);
  listField('Fitments Provided', enquiry.fitmentProvided);

  // === Notes ===
  section('Additional Notes');
  field('Note', enquiry.additionalNote);

  // === Footer ===
  y -= 20;
  page.drawLine({ start: { x: 35, y }, end: { x: width - 35, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  page.drawText('Generated by Gobind Coach Builders Enquiry System', {
    x: 40, y: y - 15, size: 10, font, color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = generateEnquiryPdf;
