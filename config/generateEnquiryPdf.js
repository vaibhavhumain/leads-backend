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
      page = pdfDoc.addPage();
    }
  };

  // 🧾 Basic Info
  drawText('Enquiry ID', enquiry.enquiryId);
  drawText('Team Member', enquiry.teamMember);
  drawText('Customer Name', enquiry.customerName);
  drawText('Company Details', enquiry.companyDetails);
  drawText('Address', enquiry.address);
  drawText('City', enquiry.city);
  drawText('State', enquiry.state);
  drawText('Pincode', enquiry.pincode);
  drawText('Phone', enquiry.customerPhone);
  drawText('Email', enquiry.customerEmail);

  // 🚌 Bus Info
  drawText('Bus Type', enquiry.busType);
  drawText('Other Bus Type', enquiry.otherBusType);
  drawText('Feature Requirement', enquiry.featureRequirement);
  drawText('AC Preference', enquiry.acPreference);
  drawText('Referral Source', enquiry.referralSource);

  // 🚛 Chassis Info
  drawText('Chassis Bought', enquiry.chassisBought);
  drawText('Chassis Purchase Time', enquiry.chassisPurchaseTime);
  drawText('Chassis Company Name', enquiry.chassisCompanyName);
  drawText('Chassis Model', enquiry.chassisModel);
  drawText('Wheel Base', enquiry.wheelBase);
  drawText('Tyre Size', enquiry.tyreSize);
  drawText('Length', enquiry.length);
  drawText('Width', enquiry.width);

  // 🪑 Seating
  drawText('Seating Pattern', enquiry.seatingPattern);
  drawText('Number of Seats', enquiry.numberOfSeats);
  drawText('Total Seats', enquiry.totalSeats);

  // 📝 Notes
  drawText('Additional Note', enquiry.additionalNote);

  // 💎 Luxury Section
  drawText('Window Type', enquiry.windowType);
  drawText('Required No Each Side', enquiry.requiredNoEachSide);
  drawText('Tint of Shades', enquiry.tintOfShades);
  drawText('Other Tint', enquiry.otherTint);
  drawText('Seat Type', enquiry.seatType);
  drawText('Seat Material', enquiry.seatMaterial);
  drawText('Curtain', enquiry.curtain);
  drawText('Flooring Type', enquiry.flooringType);
  drawText('Passenger Doors', enquiry.passengerDoors);
  drawText('Passenger Door Position', enquiry.passengerDoorPosition);
  drawText('Door Type', enquiry.doorType);
  drawText('Roof Carrier', enquiry.roofCarrier);
  drawText('Diggy Type', enquiry.diggyType);
  drawText('Side Luggage Required', enquiry.sideLuggageReq);
  drawText('Diggy Flooring', enquiry.diggyFlooring);
  drawText('Side Ladder', enquiry.sideLadder);
  drawText('Helper Foot Step', enquiry.helperFootStep);
  drawText('Rear Back Jaal', enquiry.rearBackJaal);
  drawText('Cabin Type', enquiry.cabinType);
  drawText('Specific Requirement', enquiry.specificRequirement);
  drawText('Suggested Model', enquiry.suggestedModel);
  drawText('Seat Belt', enquiry.seatBelt);
  drawText('Seat Belt Type', enquiry.seatBeltType);

  // 📦 Arrays
  drawText('Optional Features', (enquiry.optionalFeatures || []).join(', '));
  drawText('Fitment Provided', (enquiry.fitmentProvided || []).join(', '));

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = generateEnquiryPdf;
