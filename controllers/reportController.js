const ExcelJS = require("exceljs");
const Lead = require("../models/Lead");

const getUserReport = async (req, res) => {
  try {
    const userId = req.params.id;
    const { type, date, start, end } = req.query;

    console.log("📊 Report request:", { userId, type, date, start, end });

    let query = {
      $or: [
        { createdBy: userId },
        { assignedTo: userId },
        { "forwardedTo.user": userId },
      ],
    };

    // Filters
    if (type === "daily" && date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      query.updatedAt = { $gte: dayStart, $lt: dayEnd };
    }

    if ((type === "weekly" || type === "monthly") && start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setDate(endDate.getDate() + 1);
      query.updatedAt = { $gte: startDate, $lt: endDate };
    }

    const leads = await Lead.find(query)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("forwardedTo", "name email");

    console.log(`✅ Found ${leads.length} leads for report.`);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("User Leads");

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

    leads.forEach((lead) => {
      sheet.addRow({
        _id: lead._id?.toString() || "",
        clientName: lead.leadDetails?.clientName || "",
        contacts: Array.isArray(lead.leadDetails?.contacts)
          ? lead.leadDetails.contacts.map((c) => `${c.label}: ${c.number}`).join(", ")
          : "",
        companyName: lead.leadDetails?.companyName || "",
        location: lead.leadDetails?.location || "",
        status: lead.status || "",
        connectionStatus: lead.connectionStatus || "",
        remarksHistory: Array.isArray(lead.remarksHistory)
          ? lead.remarksHistory
              .map(
                (r) =>
                  `[${r?.date ? new Date(r.date).toLocaleDateString() : "No Date"}] ${
                    r?.user || "Unknown"
                  }: ${r?.remark || ""}`
              )
              .join("\n")
          : "",
        followUps: Array.isArray(lead.followUps)
          ? lead.followUps
              .map(
                (f) =>
                  `[${f?.date ? new Date(f.date).toLocaleDateString() : "No Date"}] ${
                    f?.remark || ""
                  }`
              )
              .join("\n")
          : "",
        forwardedTo: lead.forwardedTo?.name || "",
        createdBy: lead.createdBy?.name || "",
        assignedTo: lead.assignedTo?.name || "",
        updatedAt: lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : "",
      });
    });

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
    console.error("❌ Report error:", err);
    res.status(500).send("Error generating report");
  }
};

module.exports = { getUserReport };
