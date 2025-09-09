// backend/config/generateEnquiryExcel.js
const ExcelJS = require("exceljs");
const { BASE_STANDARD_FITMENTS, BASE_OPTIONAL_FITMENTS, EXTRA_COST_FITMENTS } = require("./fitments");
// 👆 adjust import path based on where your constants live

async function generateEnquiryExcel(enquiry) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Enquiry");

  // helper to add a section header
  const section = (title) => {
    ws.addRow([]);
    const row = ws.addRow([title]);
    row.font = { bold: true, size: 14 };
  };

  // helper to add a field row
  const field = (label, value) => {
    ws.addRow([label, value || "-"]);
  };

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
  const lux = enquiry.luxuryData || {};
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
  field("Specific Requirement", lux.specificRequirement);
  field("Seat Belt", lux.seatBelt);
  field("Seat Belt Type", lux.seatBeltType);

  // === Standard Fitments (BASE + Saved) ===
  section("Standard Fitments");
  (BASE_STANDARD_FITMENTS || []).forEach((fit, idx) => {
    // cross-check saved data
    const saved = (enquiry.standardFitments || []).find(f => f.key === fit.key);
    const value = saved
      ? saved.choice === "Other"
        ? saved.otherValue || "-"
        : saved.suggested || fit.suggested || "-"
      : fit.suggested || "-";
    field(`${idx + 1}. ${fit.label}`, value);
  });

  // === Optional Fitments ===
  section("Optional Fitments");
  (BASE_OPTIONAL_FITMENTS || []).forEach((opt, idx) => {
    const selected = enquiry.optionalFitmentsSelected?.includes(opt);
    field(`${idx + 1}. ${opt}`, selected ? "✔ Selected" : "✘ Not Selected");
  });

  // === Extra-cost Fitments ===
  section("Extra-cost Fitments");
  (EXTRA_COST_FITMENTS || []).forEach((fit, idx) => {
    const saved = (enquiry.extraCostFitments || []).find(f => f.key === fit.key);
    field(`${idx + 1}. ${fit.label}`, saved?.checked ? saved.company || "✔ Included" : "✘ Not Selected");
  });

  // === Custom Extras ===
  if (Array.isArray(enquiry.customExtras) && enquiry.customExtras.length > 0) {
    section("Custom Extras");
    enquiry.customExtras.forEach((extra, idx) => {
      field(`${idx + 1}. ${extra.name}`, extra.desc);
    });
  }

  // === Other Features ===
  section("Features & Extras");
  field("Optional Features", (enquiry.optionalFeatures || []).join(", "));
  field("Fitments Provided", (enquiry.fitmentProvided || []).join(", "));

  // === Notes ===
  section("Additional Notes");
  field("Note", enquiry.additionalNote);

  // return buffer for sending
  return await wb.xlsx.writeBuffer();
}

module.exports = generateEnquiryExcel;
