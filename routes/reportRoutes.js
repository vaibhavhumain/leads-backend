// routes/reportRoutes.js
import express from "express";
import ExcelJS from "exceljs";
import Lead from "../models/Lead.js";
import protect from "../middleware/auth.js";

const router = express.Router();
router.get("/user/:id", protect, async (req, res) => {
  try {
    const userId = req.params.id;
    const { type, date, start, end } = req.query;

    // Base query: leads connected to this user
    let query = {
      $or: [
        { createdBy: userId },
        { assignedTo: userId },
        { forwardedTo: userId },
      ],
    };

    // Apply date filters
    if (type === "daily" && date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      query.updatedAt = { $gte: dayStart, $lt: dayEnd };
    }

    if ((type === "weekly" || type === "monthly") && start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setDate(endDate.getDate() + 1); // include last day
      query.updatedAt = { $gte: startDate, $lt: endDate };
    }

    // Fetch leads
    const leads = await Lead.find(query)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("forwardedTo", "name email");

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("User Leads");

    // Define headers
    sheet.columns = [
      { header: "Lead ID", key: "_id", width: 25 },
      { header: "Client Name", key: "clientName", width: 25 },
      { header: "Contacts", key: "contacts", width: 40 },
      { header: "Company", key: "companyName", width: 20 },
      { header: "Location", key: "location", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Connection Status", key: "connectionStatus", width: 20 },
      { header: "Remarks History", key: "remarksHistory", width: 40 },
      { header: "Follow Ups", key: "followUps", width: 40 },
      { header: "Forwarded To", key: "forwardedTo", width: 25 },
      { header: "Created By", key: "createdBy", width: 25 },
      { header: "Assigned To", key: "assignedTo", width: 25 },
      { header: "Updated At", key: "updatedAt", width: 25 },
    ];

    // Add data rows
    leads.forEach((lead) => {
      sheet.addRow({
        _id: lead._id.toString(),
        clientName: lead.leadDetails?.clientName || "",
        contacts: lead.leadDetails?.contacts
          ?.map((c) => `${c.label}: ${c.number}`)
          .join(", "),
        companyName: lead.leadDetails?.companyName || "",
        location: lead.leadDetails?.location || "",
        status: lead.status || "",
        connectionStatus: lead.connectionStatus || "",
        remarksHistory: lead.remarksHistory
          ?.map(
            (r) =>
              `[${new Date(r.date).toLocaleDateString()}] ${r.user}: ${
                r.remark
              }`
          )
          .join("\n"),
        followUps: lead.followUps
          ?.map(
            (f) =>
              `[${new Date(f.date).toLocaleDateString()}] ${f.remark || ""}`
          )
          .join("\n"),
        forwardedTo: lead.forwardedTo?.name || "",
        createdBy: lead.createdBy?.name || "",
        assignedTo: lead.assignedTo?.name || "",
        updatedAt: lead.updatedAt
          ? new Date(lead.updatedAt).toLocaleString()
          : "",
      });
    });

    // Send Excel file as response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=user-${userId}-report.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ Error generating report:", err);
    res.status(500).send("Error generating report");
  }
});

export default router;
