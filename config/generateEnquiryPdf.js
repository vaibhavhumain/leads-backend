// backend/config/generateEnquiryPdf.js
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

async function generateEnquiryPdf(enquiry) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fontSize = 12;
  let page, width, height, y;
  let logo = null;

  // === Load Logo ===
  const logoPath = path.resolve(__dirname, "logo.png");
  try {
    const logoImage = fs.readFileSync(logoPath);
    logo = await pdfDoc.embedPng(logoImage);
  } catch {
    console.warn("⚠️ Logo not found, skipping logo embedding");
  }

  // === New Page with Logo Helper ===
  function addPage() {
    page = pdfDoc.addPage();
    width = page.getSize().width;
    height = page.getSize().height;
    y = height - 80;

    if (logo) {
      // Watermark
      const wmWidth = width * 0.65;
      const wmHeight = logo.height * (wmWidth / logo.width);
      page.drawImage(logo, {
        x: (width - wmWidth) / 2,
        y: (height - wmHeight) / 2,
        width: wmWidth,
        height: wmHeight,
        opacity: 0.12,
      });

      // Small logo top-left
      const small = logo.scale(0.15);
      page.drawImage(logo, { x: 40, y: height - 60, width: small.width, height: small.height });
    }
  }

  addPage();

  // === Helpers ===
  function newPageIfNeeded() {
    if (y < 80) addPage();
  }

  function section(title) {
    y -= 35;
    newPageIfNeeded();
    page.drawRectangle({
      x: 30,
      y: y + 8,
      width: width - 60,
      height: 26,
      color: rgb(0.87, 0.92, 1),
    });
    page.drawText(title, {
      x: 38,
      y: y + 12,
      size: 14,
      font: boldFont,
      color: rgb(0.09, 0.33, 0.68),
    });
    y -= 14;
  }

  function field(label, value) {
    newPageIfNeeded();
    page.drawText(`${label}:`, {
      x: 42,
      y,
      size: fontSize,
      font: boldFont,
      color: rgb(0.18, 0.18, 0.18),
    });
    page.drawText(`${value || "-"}`, {
      x: 180,
      y,
      size: fontSize,
      font,
      color: rgb(0.18, 0.18, 0.18),
    });
    y -= 20;
  }

  function listField(label, arr = []) {
    field(label, arr && arr.length ? arr.join(", ") : "-");
  }

  // === Basic Info ===
  section("Basic Information");
  field("Enquiry ID", enquiry.enquiryId);
  field("Team Member", enquiry.teamMember);
  field("Customer Name", enquiry.customerName);
  field("Company", enquiry.companyDetails);
  field("Phone", enquiry.customerPhone);
  field("Email", enquiry.customerEmail);
  field("Address", `${enquiry.address || ""} ${enquiry.city || ""}, ${enquiry.state || ""} - ${enquiry.pincode || ""}`);

  // === Business & Personal ===
  section("Business & Personal");
  field("Type of Buses in Fleet", enquiry.businessTypeOfBuses);
  field("No. of Buses", enquiry.businessNumberOfBuses);
  field("Previous Body Builder", enquiry.businessPreviousBodyBuilder);
  field("Buses per Year", enquiry.businessBusesPerYear);
  field("Employees", enquiry.businessEmployees);
  field("Expertise Area", enquiry.businessExpertiseArea);
  field("Education", enquiry.education);
  field("Hobbies", enquiry.hobbies);
  field("Behavior", enquiry.behavior);
  field("Customer Type", enquiry.customerType);

  // === Requirement ===
  section("Bus Requirement");
  field("Bus Type", enquiry.busType);
  field("Other Bus Type", enquiry.otherBusType);
  field("Feature Requirement", enquiry.featureRequirement);
  field("AC Preference", enquiry.acPreference);
  field("Referral Source", enquiry.referralSource);

  // === Chassis ===
  section("Chassis & Dimensions");
  field("Chassis Bought", enquiry.chassisBought);
  field("Purchase Time", enquiry.chassisPurchaseTime);
  field("Company", enquiry.chassisCompanyName);
  field("Model", enquiry.chassisModel);
  field("Wheel Base", enquiry.wheelBase);
  field("Tyre Size", enquiry.tyreSize);
  field("Length", enquiry.length);
  field("Width", enquiry.width);

  // === Seating ===
  section("Seating");
  field("Seating Pattern", enquiry.seatingPattern);
  field("Number of Seats", enquiry.numberOfSeats);
  field("Total Seats", enquiry.totalSeats);

    // === Luxury ===
  section("Luxury / Fitment");
  const lux = enquiry.luxuryData || {};   // ✅ FIX: use nested object

  field("Suggested Model", lux.suggestedModel || enquiry.suggestedModel);
  field("Window Type", lux.windowType);
  field("Required No Each Side", lux.requiredNoEachSide);
  field("Tint of Shades", lux.tintOfShades);
  field("Seat Type", lux.seatType);
  field("Seat Material", lux.seatMaterial);
  field("Curtain", lux.curtain);
  field("Flooring Type", lux.flooringType);
  field("Passenger Doors", lux.passengerDoors);
  field("Door Position", lux.passengerDoorPosition);
  field("Door Type", lux.doorType);
  field("Roof Carrier", lux.roofCarrier);
  field("Diggy Type", lux.diggyType);
  field("Side Luggage", lux.sideLuggageRequirement);
  field("Diggy Flooring", lux.diggyFlooring);
  field("Side Ladder", lux.sideLadder);
  field("Helper Foot Step", lux.helperFootStep);
  field("Rear Back Jaal", lux.rearBackJaal);
  field("Cabin Type", lux.cabinType);
  field("Specific Requirement", lux.sideLuggageRequirement);
  field("Seat Belt", lux.seatBelt);
  field("Seat Belt Type", lux.seatBeltType);


  // === Standard Fitments (Cleaned) ===
  if (Array.isArray(enquiry.standardFitments) && enquiry.standardFitments.length > 0) {
    section("Standard Fitments");
    enquiry.standardFitments.forEach((fit, idx) => {
      let value = "-";
      if (fit.choice && fit.choice !== "Suggested") {
        value = fit.choice;
      } else if (fit.otherValue) {
        value = fit.otherValue;
      } else if (fit.suggested) {
        value = fit.suggested; // fallback
      }
      field(`${idx + 1}. ${fit.label || fit.key}`, value);
    });
  }

  // === Optional Fitments ===
  if (Array.isArray(enquiry.optionalFitmentsSelected) && enquiry.optionalFitmentsSelected.length > 0) {
    section("Optional Fitments");
    enquiry.optionalFitmentsSelected.forEach((fit, idx) => {
      field(`${idx + 1}.`, fit);
    });
  }

  // === Extra-cost Fitments ===
  if (Array.isArray(enquiry.extraCostFitments) && enquiry.extraCostFitments.length > 0) {
    section("Extra-cost Fitments");
    enquiry.extraCostFitments.forEach((fit, idx) => {
      field(`${idx + 1}. ${fit.label || fit.key}`, fit.company || "-");
    });
  }

  // === Custom Extras ===
  if (Array.isArray(enquiry.customExtras) && enquiry.customExtras.length > 0) {
    section("Custom Extras");
    enquiry.customExtras.forEach((extra, idx) => {
      field(`${idx + 1}. ${extra.name || "-"}`, extra.desc || "-");
    });
  }

  // === Other Features ===
  section("Features & Extras");
  listField("Optional Features", enquiry.optionalFeatures);
  listField("Fitments Provided", enquiry.fitmentProvided);

  // === Notes ===
  section("Additional Notes");
  field("Note", enquiry.additionalNote);

  // === Footer ===
  y -= 20;
  page.drawLine({
    start: { x: 35, y },
    end: { x: width - 35, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  page.drawText("Generated by Gobind Coach Builders Enquiry System", {
    x: 40,
    y: y - 15,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = generateEnquiryPdf;
