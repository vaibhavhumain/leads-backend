// controllers/reportController.js
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

    // === DATE FILTERS ===
    if (type === "daily" && date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      query.updatedAt = { $gte: dayStart, $lt: dayEnd };
    }

    if (type === "previous-daily") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      query.updatedAt = { $gte: yesterday, $lt: today };
    }

    if (type === "weekly" && start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setDate(endDate.getDate() + 1);
      query.updatedAt = { $gte: startDate, $lt: endDate };
    }

    if (type === "previous-weekly") {
      const now = new Date();
      const day = now.getDay(); // 0=Sun, 1=Mon
      const diffToMonday = day === 0 ? 6 : day - 1;
      const thisMonday = new Date(now);
      thisMonday.setDate(thisMonday.getDate() - diffToMonday);
      thisMonday.setHours(0, 0, 0, 0);

      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);

      query.updatedAt = { $gte: lastMonday, $lt: thisMonday };
    }

    if (type === "monthly" && start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setDate(endDate.getDate() + 1);
      query.updatedAt = { $gte: startDate, $lt: endDate };
    }

    if (type === "previous-monthly") {
      const now = new Date();
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );
      query.updatedAt = { $gte: firstOfLastMonth, $lt: firstOfThisMonth };
    }

    // === FETCH DATA ===
    const leads = await Lead.find(query)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("forwardedTo.user", "name email")
      .populate("followUps.by", "name email")
      .populate("remarksHistory.updatedBy", "name email");

    console.log(`✅ Found ${leads.length} leads for report.`);

    // === EXCEL CREATION ===
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
          ? lead.leadDetails.contacts
              .map((c) => `${c.label}: ${c.number}`)
              .join(", ")
          : "",
        companyName: lead.leadDetails?.companyName || "",
        location: lead.leadDetails?.location || "",
        status: lead.status || "",
        connectionStatus: lead.connectionStatus || "",

        // ✅ Remarks History (remarks + updatedBy)
        remarksHistory: Array.isArray(lead.remarksHistory)
          ? lead.remarksHistory
              .map(
                (r) =>
                  `[${r?.date ? new Date(r.date).toLocaleDateString() : "No Date"}] ${
                    r?.remarks || ""
                  } ${r?.updatedBy?.name ? `(by: ${r.updatedBy.name})` : ""}`
              )
              .join("\n")
          : "",

        // ✅ Follow Ups (notes + by)
        followUps: Array.isArray(lead.followUps)
          ? lead.followUps
              .map(
                (f) =>
                  `[${f?.date ? new Date(f.date).toLocaleDateString() : "No Date"}] ${
                    f?.notes || ""
                  } ${f?.by?.name ? `(by: ${f.by.name})` : ""}`
              )
              .join("\n")
          : "",

        forwardedTo: lead.forwardedTo?.user?.name || "",
        createdBy: lead.createdBy?.name || "",
        assignedTo: lead.assignedTo?.name || "",
        updatedAt: lead.updatedAt
          ? new Date(lead.updatedAt).toLocaleString()
          : "",
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
