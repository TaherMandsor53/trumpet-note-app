/**
 * ============================================================================
 * TAHERI SCOUT BAND GROUP - GOOGLE APPS SCRIPT WEB APP INTEGRATION
 * ============================================================================
 * 
 * SPREADSHEET: Band Members Credentials
 * URL: https://docs.google.com/spreadsheets/d/1OwHHmLqRnzYa930ii3lxCvK0030Uy5atIP161C-QVLs/edit
 * 
 * ----------------------------------------------------------------------------
 * STEP-BY-STEP DEPLOYMENT INSTRUCTIONS:
 * ----------------------------------------------------------------------------
 * 1. Open your Google Spreadsheet:
 *    https://docs.google.com/spreadsheets/d/1OwHHmLqRnzYa930ii3lxCvK0030Uy5atIP161C-QVLs/edit
 * 
 * 2. In the top menu bar, click:
 *    Extensions > Apps Script
 *    (This opens the Apps Script Editor in a new browser tab)
 * 
 * 3. In the Apps Script Editor (Code.gs):
 *    - Select all existing text (Ctrl + A or Cmd + A) and delete it.
 *    - Copy this entire file and paste it into the editor.
 *    - Press Ctrl + S (or Cmd + S) to save.
 * 
 * 4. Deploy as a Web App:
 *    - At the top right of Apps Script, click the blue "Deploy" button.
 *    - Click "New deployment".
 *    - In the dialog, click the gear icon (Select type) and choose "Web app".
 *    - Set the following fields:
 *        * Description: Taheri Scout Band API
 *        * Execute as: Me (taheriscoutgroupdahod@gmail.com)
 *        * Who has access: Anyone  <-- (VERY IMPORTANT: must be Anyone so your app can sync without complex OAuth)
 *    - Click "Deploy".
 * 
 * 5. Authorize Access (first time only):
 *    - A popup titled "Authorization required" will appear. Click "Authorize access".
 *    - Choose your Google Account (taheriscoutgroupdahod@gmail.com).
 *    - If you see "Google hasn't verified this app", click "Advanced" (at bottom left).
 *    - Click "Go to Taheri Scout Band API (unsafe)".
 *    - Click "Allow".
 * 
 * 6. Copy the Web App URL:
 *    - Google will show a "Web app URL" ending in /exec:
 *      e.g. https://script.google.com/macros/s/AKfycbx.../exec
 *    - Click "Copy".
 * 
 * 7. Paste into your Application:
 *    - Open your .env and .env.local files in this project.
 *    - Paste the copied URL:
 *      GOOGLE_SHEET_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 * 
 * 8. Whenever you add, edit, or delete any member in the portal, it will instantly
 *    reflect in the "Member Details" sheet in your Google Drive and in the local Excel file!
 * ============================================================================
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var param = (e && e.parameter) || {};
    
    // Health check ping
    if (param.action === "ping") {
      return createJsonResponse({
        status: "ok",
        message: "Taheri Scout Band Apps Script API is active.",
        spreadsheet: ss.getName(),
        time: new Date().toISOString()
      });
    }

    // Cleanup extra appended rows in Attendance Details sheet
    if (param.action === "cleanupAttendance") {
      var attSheetClean = ss.getSheetByName("Attendance Details");
      if (attSheetClean) {
        var lastRowClean = attSheetClean.getLastRow();
        var deletedCount = 0;
        for (var rc = lastRowClean; rc > 41; rc--) {
          attSheetClean.deleteRow(rc);
          deletedCount++;
        }
        return createJsonResponse({
          success: true,
          message: "Cleaned up " + deletedCount + " extra rows from Attendance Details sheet. Exactly 40 members remain."
        });
      }
    }

    var sheetName = param.sheet || "Member Details";
    var sheet = ss.getSheetByName(sheetName) || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return createJsonResponse({ success: true, count: 0, members: [] });
    }

    var headers = data[0].map(function(h) {
      return String(h).trim();
    });

    var members = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Skip completely empty rows
      var hasData = row.some(function(cell) {
        return cell !== undefined && cell !== null && String(cell).trim() !== "";
      });
      if (!hasData) continue;

      // In Attendance Details, rows must have a valid member name in Column A
      if (sheetName === "Attendance Details" && !String(row[0] || "").trim()) {
        continue;
      }

      var item = {};
      for (var j = 0; j < headers.length; j++) {
        item[headers[j]] = row[j];
      }
      members.push(item);
    }

    return createJsonResponse({
      success: true,
      count: members.length,
      sheet: sheet.getName(),
      members: members
    });
  } catch (err) {
    return createJsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        body = e.parameter || {};
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    var action = body.action || "addMember";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ------------------------------------------------------------------------
    // ACTION: addMember
    // ------------------------------------------------------------------------
    if (action === "addMember") {
      var sheetName = body.sheetName || "Member Details";
      var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName("Responses") || ss.getSheets()[0];
      var m = body.member || {};

      var data = sheet.getDataRange().getValues();

      // If sheet has no header row, initialize with standard headers
      if (data.length === 0 || (data.length === 1 && data[0].join("").trim() === "")) {
        sheet.appendRow([
          "Its number",
          "Full Name",
          "Address",
          "Mobile Number",
          "Jamaat",
          "Role",
          "UserName"
        ]);
        data = sheet.getDataRange().getValues();
      }

      var headerRow = data[0];
      var colMap = mapHeaders(headerRow);

      var userIts = String(m.itsNumber || "").trim();
      var userName = String(m.name || "").trim().toLowerCase();

      // Check if member already exists by ITS or Name
      var existingRowIndex = -1;
      for (var r = 1; r < data.length; r++) {
        var rowIts = colMap.its !== -1 ? String(data[r][colMap.its] || "").trim() : "";
        var rowName = colMap.name !== -1 ? String(data[r][colMap.name] || "").trim().toLowerCase() : "";
        if ((userIts && rowIts === userIts) || (userName && rowName === userName)) {
          existingRowIndex = r + 1; // 1-based index in Google Sheets
          break;
        }
      }

      var usernameCred = (m.username || m.email || "").trim();
      var roleValue = (m.role || m.section || "").trim();

      if (existingRowIndex > 0) {
        // Update existing row in place
        if (colMap.its !== -1 && m.itsNumber) sheet.getRange(existingRowIndex, colMap.its + 1).setValue(m.itsNumber);
        if (colMap.name !== -1 && m.name) sheet.getRange(existingRowIndex, colMap.name + 1).setValue(m.name);
        if (colMap.address !== -1 && m.address !== undefined) sheet.getRange(existingRowIndex, colMap.address + 1).setValue(m.address);
        if (colMap.phone !== -1 && m.phone !== undefined) sheet.getRange(existingRowIndex, colMap.phone + 1).setValue(m.phone);
        if (colMap.jamaat !== -1 && m.jamaat !== undefined) sheet.getRange(existingRowIndex, colMap.jamaat + 1).setValue(m.jamaat);
        if (colMap.role !== -1 && roleValue) sheet.getRange(existingRowIndex, colMap.role + 1).setValue(roleValue);
        if (colMap.username !== -1 && usernameCred) sheet.getRange(existingRowIndex, colMap.username + 1).setValue(usernameCred);

        return createJsonResponse({
          success: true,
          action: "updateMember",
          row: existingRowIndex,
          message: "Existing member " + (m.name || "") + " updated in Google Sheet."
        });
      }

      // Build new row array matching the exact columns of the sheet
      var newRow = [];
      for (var c = 0; c < headerRow.length; c++) {
        var colHeader = String(headerRow[c] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        if (colHeader.indexOf("its") !== -1) {
          newRow.push(m.itsNumber || "");
        } else if (colHeader.indexOf("fullname") !== -1 || (colHeader.indexOf("name") !== -1 && colHeader.indexOf("user") === -1)) {
          newRow.push(m.name || "");
        } else if (colHeader.indexOf("address") !== -1) {
          newRow.push(m.address || "");
        } else if (colHeader.indexOf("mobile") !== -1 || colHeader.indexOf("phone") !== -1) {
          newRow.push(m.phone || "");
        } else if (colHeader.indexOf("jamaat") !== -1) {
          newRow.push(m.jamaat || "");
        } else if (colHeader.indexOf("role") !== -1 || colHeader.indexOf("instrument") !== -1) {
          newRow.push(roleValue);
        } else if (colHeader.indexOf("user") !== -1 || colHeader.indexOf("email") !== -1) {
          newRow.push(usernameCred);
        } else if (colHeader.indexOf("sno") !== -1) {
          newRow.push(sheet.getLastRow());
        } else {
          newRow.push("");
        }
      }

      // If headers didn't match any known fields, fallback to standard row:
      if (newRow.length === 0) {
        newRow = [
          m.itsNumber || "",
          m.name || "",
          m.address || "",
          m.phone || "",
          m.jamaat || "",
          roleValue,
          usernameCred
        ];
      }

      sheet.appendRow(newRow);
      var appendedRow = sheet.getLastRow();

      return createJsonResponse({
        success: true,
        action: "addMember",
        row: appendedRow,
        message: "Member " + (m.name || "") + " successfully added at row " + appendedRow + " in " + sheet.getName() + " sheet."
      });
    }

    // ------------------------------------------------------------------------
    // ACTION: editMember
    // ------------------------------------------------------------------------
    if (action === "editMember") {
      var sheetName = body.sheetName || "Member Details";
      var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName("Responses") || ss.getSheets()[0];
      var em = body.member || {};
      var data = sheet.getDataRange().getValues();
      var colMap = mapHeaders(data[0] || []);

      var editIts = String(em.itsNumber || "").trim();
      var editName = String(em.name || "").trim().toLowerCase();
      var targetRow = -1;

      for (var r = 1; r < data.length; r++) {
        var rowIts = colMap.its !== -1 ? String(data[r][colMap.its] || "").trim() : "";
        var rowName = colMap.name !== -1 ? String(data[r][colMap.name] || "").trim().toLowerCase() : "";
        if ((editIts && rowIts === editIts) || (editName && rowName === editName)) {
          targetRow = r + 1;
          break;
        }
      }

      if (targetRow > 0) {
        if (colMap.its !== -1 && em.itsNumber) sheet.getRange(targetRow, colMap.its + 1).setValue(em.itsNumber);
        if (colMap.name !== -1 && em.name) sheet.getRange(targetRow, colMap.name + 1).setValue(em.name);
        if (colMap.address !== -1 && em.address !== undefined) sheet.getRange(targetRow, colMap.address + 1).setValue(em.address);
        if (colMap.phone !== -1 && em.phone !== undefined) sheet.getRange(targetRow, colMap.phone + 1).setValue(em.phone);
        if (colMap.jamaat !== -1 && em.jamaat !== undefined) sheet.getRange(targetRow, colMap.jamaat + 1).setValue(em.jamaat);
        if (colMap.role !== -1 && (em.role || em.section)) sheet.getRange(targetRow, colMap.role + 1).setValue(em.role || em.section);
        if (colMap.username !== -1 && (em.username || em.email)) sheet.getRange(targetRow, colMap.username + 1).setValue(em.username || em.email);

        return createJsonResponse({
          success: true,
          row: targetRow,
          message: "Member " + (em.name || "") + " updated in Google Sheet."
        });
      } else {
        // If not found, append as new record so changes are never dropped
        return doPost({
          postData: { contents: JSON.stringify({ action: "addMember", sheetName: sheetName, member: em }) }
        });
      }
    }

    // ------------------------------------------------------------------------
    // ACTION: deleteMember
    // ------------------------------------------------------------------------
    if (action === "deleteMember") {
      var sheetName = body.sheetName || "Member Details";
      var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName("Responses") || ss.getSheets()[0];
      var targetIts = String(body.itsNumber || "").trim();
      var targetName = String(body.name || "").trim().toLowerCase();
      var data = sheet.getDataRange().getValues();
      var colMap = mapHeaders(data[0] || []);

      var deleteRowIndex = -1;
      for (var r = 1; r < data.length; r++) {
        var rowIts = colMap.its !== -1 ? String(data[r][colMap.its] || "").trim() : "";
        var rowName = colMap.name !== -1 ? String(data[r][colMap.name] || "").trim().toLowerCase() : "";
        if ((targetIts && rowIts === targetIts) || (targetName && rowName === targetName)) {
          deleteRowIndex = r + 1;
          break;
        }
      }

      if (deleteRowIndex > 0) {
        sheet.deleteRow(deleteRowIndex);
        return createJsonResponse({
          success: true,
          message: "Member removed from Google Sheet row " + deleteRowIndex
        });
      } else {
        return createJsonResponse({
          success: false,
          message: "Member not found in Google Sheet to delete."
        });
      }
    }

    // ------------------------------------------------------------------------
    // ACTION: updatePassword
    // ------------------------------------------------------------------------
    if (action === "updatePassword") {
      var sheet = ss.getSheetByName(body.sheetName || "Member Details") || ss.getSheets()[0];
      var username = String(body.username || "").trim().toLowerCase();
      var newPassword = String(body.newPassword || "");
      var data = sheet.getDataRange().getValues();
      var colMap = mapHeaders(data[0] || []);

      var userCol = colMap.username !== -1 ? colMap.username : colMap.name;
      var passCol = colMap.password;

      // If no password column exists in sheet, add it to the header
      if (passCol === -1) {
        passCol = data[0].length;
        sheet.getRange(1, passCol + 1).setValue("Password");
      }

      var foundRow = -1;
      for (var i = 1; i < data.length; i++) {
        var cellVal = String(data[i][userCol] || "").trim().toLowerCase();
        if (cellVal === username || (colMap.its !== -1 && String(data[i][colMap.its] || "").trim() === username)) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow > 0) {
        sheet.getRange(foundRow, passCol + 1).setValue(newPassword);
        return createJsonResponse({
          success: true,
          message: "Password updated in Google Sheet for " + username
        });
      } else {
        return createJsonResponse({
          error: "Username " + username + " not found in Member Details sheet."
        });
      }
    }

    // ------------------------------------------------------------------------
    // ACTION: updateAttendance & cleanupAttendance
    // ------------------------------------------------------------------------
    if (action === "updateAttendance" || action === "cleanupAttendance") {
      var attSheet = ss.getSheetByName("Attendance Details");
      if (!attSheet) {
        return createJsonResponse({ error: "Attendance Details sheet not found." });
      }

      // Step 1: Cleanup any erroneously appended duplicate rows below row 41
      // The real members in Attendance Details are strictly rows 2 to 41.
      var lastRow = attSheet.getLastRow();
      var removedRows = 0;
      for (var r = lastRow; r > 41; r--) {
        attSheet.deleteRow(r);
        removedRows++;
      }

      if (action === "cleanupAttendance") {
        return createJsonResponse({
          success: true,
          message: "Cleaned up " + removedRows + " invalid rows from Attendance Details sheet. Exactly 40 members remain."
        });
      }

      // Format date: DD/MM/YYYY
      var rawDate = String(body.date || new Date().toISOString().split("T")[0]).trim();
      var dateParts = rawDate.split("-");
      var formattedDate = dateParts.length === 3 ? (dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0]) : rawDate;

      // Re-read data after cleanup
      var attData = attSheet.getDataRange().getValues();
      if (attData.length === 0) {
        return createJsonResponse({ error: "Attendance Details sheet is empty." });
      }

      var headerRow = attData[0];
      var attHeaders = headerRow.map(function(h) { return String(h || "").trim(); });

      // Find or create the column for the selected date
      var dateColIndex = -1;
      for (var h = 0; h < attHeaders.length; h++) {
        var hdr = attHeaders[h];
        if (hdr === formattedDate || hdr === rawDate) {
          dateColIndex = h;
          break;
        }
      }

      // For every new date, add that date as column header given in image
      if (dateColIndex === -1) {
        dateColIndex = attHeaders.length;
        attSheet.getRange(1, dateColIndex + 1).setValue(formattedDate);
      }

      // Normalization helper (lowercase, alphanumeric characters only)
      function normStr(v) {
        return String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      }

      // Build member index map from Column A (Full Name) in rows 2 to 41
      var nameRowMap = {};
      for (var rowIdx = 1; rowIdx < Math.min(attData.length, 41); rowIdx++) {
        var fullNameVal = String(attData[rowIdx][0] || "").trim();
        if (fullNameVal) {
          nameRowMap[normStr(fullNameVal)] = rowIdx + 1; // 1-based row index in spreadsheet
        }
      }

      var records = body.records || [];
      var updatedCount = 0;

      for (var k = 0; k < records.length; k++) {
        var rec = records[k];
        var memberName = String(rec.name || rec.userName || "").trim();
        var statusVal = String(rec.status || "").trim();

        if (!statusVal) continue;

        // Standardize status capitalization ('Present', 'Absent', 'Late')
        var lowerStatus = statusVal.toLowerCase();
        if (lowerStatus === "present") statusVal = "Present";
        else if (lowerStatus === "absent") statusVal = "Absent";
        else if (lowerStatus === "late") statusVal = "Late";

        // Find existing member by Full Name in Column A - NEVER ADD A NEW ROW OR NAME OR ITS!
        var targetRow = null;
        if (memberName) {
          var normName = normStr(memberName);
          if (nameRowMap[normName]) {
            targetRow = nameRowMap[normName];
          } else {
            // Partial fuzzy match against existing Column A names
            var keys = Object.keys(nameRowMap);
            for (var ki = 0; ki < keys.length; ki++) {
              var key = keys[ki];
              if (normName.indexOf(key) !== -1 || key.indexOf(normName) !== -1) {
                targetRow = nameRowMap[key];
                break;
              }
            }
          }
        }

        // ONLY update attendance (Present, Absent, Late) in that member's row under dateColIndex
        // DO NOT add name or ITS
        if (targetRow) {
          attSheet.getRange(targetRow, dateColIndex + 1).setValue(statusVal);
          updatedCount++;
        }
      }

      return createJsonResponse({
        success: true,
        message: "Attendance updated for " + formattedDate + " against " + updatedCount + " members in Attendance Details sheet."
      });
    }

    // ------------------------------------------------------------------------
    // ACTION: addLavajamRecord
    // ------------------------------------------------------------------------
    if (action === "addLavajamRecord") {
      var lavSheet = ss.getSheetByName("Lavajam Details");
      if (!lavSheet) {
        lavSheet = ss.insertSheet("Lavajam Details");
        lavSheet.appendRow(["Date", "Full Name", "Fund Type", "Amount"]);
      }
      var rec = body.record || body;
      var dateVal = String(rec.date || "").trim();
      if (!dateVal) {
        var d = new Date();
        var dd = String(d.getDate()).padStart(2, '0');
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        dateVal = dd + "/" + mm + "/" + d.getFullYear();
      }
      var nameVal = String(rec.userName || rec.name || rec["Full Name"] || "").trim();
      var fundVal = String(rec.fundType || rec["Fund Type"] || "Lavajam").trim();
      var amountVal = Number(rec.amount || 0);

      lavSheet.appendRow([dateVal, nameVal, fundVal, amountVal]);
      return createJsonResponse({
        success: true,
        message: "Lavajam record for " + nameVal + " added to Lavajam Details sheet."
      });
    }

    // ------------------------------------------------------------------------
    // ACTION: updateLavajamRecord
    // ------------------------------------------------------------------------
    if (action === "updateLavajamRecord") {
      var lavSheet = ss.getSheetByName("Lavajam Details");
      if (!lavSheet) return createJsonResponse({ error: "Lavajam Details sheet not found." });
      var rec = body.record || body;
      var targetName = String(rec.originalName || rec.userName || rec.name || "").trim().toLowerCase();
      var dateVal = String(rec.date || "").trim();
      var fundVal = String(rec.fundType || "Lavajam").trim();
      var amountVal = Number(rec.amount || 0);
      var newName = String(rec.userName || rec.name || "").trim();

      var data = lavSheet.getDataRange().getValues();
      var targetRow = -1;
      if (body.rowIndex && body.rowIndex > 1 && body.rowIndex <= data.length) {
        targetRow = body.rowIndex;
      } else {
        for (var r = 1; r < data.length; r++) {
          var rowName = String(data[r][1] || "").trim().toLowerCase();
          if (rowName === targetName) {
            targetRow = r + 1;
            break;
          }
        }
      }

      if (targetRow > 0) {
        if (dateVal) lavSheet.getRange(targetRow, 1).setValue(dateVal);
        if (newName) lavSheet.getRange(targetRow, 2).setValue(newName);
        if (fundVal) lavSheet.getRange(targetRow, 3).setValue(fundVal);
        if (amountVal) lavSheet.getRange(targetRow, 4).setValue(amountVal);
        return createJsonResponse({
          success: true,
          message: "Lavajam record updated at row " + targetRow
        });
      } else {
        lavSheet.appendRow([dateVal, newName, fundVal, amountVal]);
        return createJsonResponse({
          success: true,
          message: "Lavajam record appended as new row in Lavajam Details sheet."
        });
      }
    }

    // ------------------------------------------------------------------------
    // ACTION: deleteLavajamRecord
    // ------------------------------------------------------------------------
    if (action === "deleteLavajamRecord") {
      var lavSheet = ss.getSheetByName("Lavajam Details");
      if (!lavSheet) return createJsonResponse({ error: "Lavajam Details sheet not found." });
      var targetName = String(body.userName || body.name || "").trim().toLowerCase();
      var data = lavSheet.getDataRange().getValues();
      var deleteRow = -1;
      if (body.rowIndex && body.rowIndex > 1 && body.rowIndex <= data.length) {
        deleteRow = body.rowIndex;
      } else {
        for (var r = 1; r < data.length; r++) {
          var rowName = String(data[r][1] || "").trim().toLowerCase();
          if (rowName === targetName) {
            deleteRow = r + 1;
            break;
          }
        }
      }

      if (deleteRow > 0) {
        lavSheet.deleteRow(deleteRow);
        return createJsonResponse({
          success: true,
          message: "Lavajam record removed from row " + deleteRow
        });
      }
      return createJsonResponse({ success: false, message: "Record not found in Lavajam Details." });
    }

    // ------------------------------------------------------------------------
    // ACTION: addLavajamRecord / updateLavajamRecord / syncLavajamYearEntry
    // ------------------------------------------------------------------------
    if (action === "addLavajamRecord" || action === "updateLavajamRecord" || action === "syncLavajamYearEntry") {
      var lavSheet = ss.getSheetByName("Lavajam Details");
      if (!lavSheet) {
        lavSheet = ss.insertSheet("Lavajam Details");
        lavSheet.appendRow(["Full Name", "Fund Type", "2026"]);
      }

      var rec = body.record || body;
      var targetYear = String(body.year || rec.year || "2026").trim();
      var targetName = String(rec.originalName || rec.userName || body.userName || "").trim().toLowerCase();
      var fundType = String(rec.fundType || "Lavajam").trim();
      var amount = Number(rec.amount || 0);

      var data = lavSheet.getDataRange().getValues();
      var headerRow = data[0] || [];

      // Find Name, Fund Type, and Year column indices (1-based for Sheets API getRange)
      var nameColIdx = -1;
      var fundColIdx = -1;
      var yearColIdx = -1;

      for (var c = 0; c < headerRow.length; c++) {
        var colName = String(headerRow[c] || "").trim();
        var colNorm = colName.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (colNorm === "fullname" || colNorm === "name") {
          nameColIdx = c + 1;
        } else if (colNorm === "fundtype") {
          fundColIdx = c + 1;
        } else if (colName === targetYear) {
          yearColIdx = c + 1;
        }
      }

      if (nameColIdx === -1) nameColIdx = 1;
      if (fundColIdx === -1) fundColIdx = 2;

      // If the target Year column does not exist yet, add it
      if (yearColIdx === -1) {
        yearColIdx = headerRow.length + 1;
        lavSheet.getRange(1, yearColIdx).setValue(targetYear);
      }

      // Search for matching member or Hoob contributor
      var targetRowIdx = -1;
      for (var r = 1; r < data.length; r++) {
        var rowName = String(data[r][nameColIdx - 1] || "").trim().toLowerCase();
        if (rowName === targetName) {
          targetRowIdx = r + 1; // 1-based row
          break;
        }
      }

      if (targetRowIdx > 0) {
        // Update existing member or Hoob contributor
        lavSheet.getRange(targetRowIdx, fundColIdx).setValue(fundType);
        lavSheet.getRange(targetRowIdx, yearColIdx).setValue(amount > 0 ? amount : "");
        return createJsonResponse({
          success: true,
          action: action,
          row: targetRowIdx,
          message: "Updated " + (rec.userName || targetName) + " in Lavajam Details sheet (Year: " + targetYear + ", Amount: " + amount + ")."
        });
      } else {
        // New contributor (e.g. Hoob)
        var newRow = [];
        var maxCols = Math.max(headerRow.length, yearColIdx);
        for (var i = 0; i < maxCols; i++) {
          newRow.push("");
        }
        newRow[nameColIdx - 1] = rec.userName || targetName;
        newRow[fundColIdx - 1] = fundType;
        newRow[yearColIdx - 1] = amount > 0 ? amount : "";
        lavSheet.appendRow(newRow);
        return createJsonResponse({
          success: true,
          action: action,
          row: lavSheet.getLastRow(),
          message: "Added " + (rec.userName || targetName) + " to Lavajam Details sheet (Year: " + targetYear + ", Amount: " + amount + ")."
        });
      }
    }

    // ------------------------------------------------------------------------
    // ACTION: deleteLavajamRecord
    // ------------------------------------------------------------------------
    if (action === "deleteLavajamRecord") {
      var lavSheet = ss.getSheetByName("Lavajam Details");
      if (!lavSheet) return createJsonResponse({ error: "Lavajam Details sheet not found." });

      var rec = body.record || body;
      var targetYear = String(body.year || rec.year || "2026").trim();
      var targetName = String(body.userName || rec.userName || rec.originalName || "").trim().toLowerCase();
      var data = lavSheet.getDataRange().getValues();
      var headerRow = data[0] || [];

      var nameColIdx = 1;
      var fundColIdx = 2;
      var yearColIdx = -1;

      for (var c = 0; c < headerRow.length; c++) {
        var colName = String(headerRow[c] || "").trim();
        var colNorm = colName.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (colNorm === "fullname" || colNorm === "name") nameColIdx = c + 1;
        if (colNorm === "fundtype") fundColIdx = c + 1;
        if (colName === targetYear) yearColIdx = c + 1;
      }

      var targetRowIdx = -1;
      var rowFundType = "";
      for (var r = 1; r < data.length; r++) {
        var rowName = String(data[r][nameColIdx - 1] || "").trim().toLowerCase();
        if (rowName === targetName) {
          targetRowIdx = r + 1;
          rowFundType = String(data[r][fundColIdx - 1] || "").trim().toLowerCase();
          break;
        }
      }

      if (targetRowIdx > 0) {
        if (rowFundType.indexOf("hoob") !== -1) {
          // If Hoob, delete the row
          lavSheet.deleteRow(targetRowIdx);
          return createJsonResponse({
            success: true,
            message: "Hoob record removed from Lavajam Details row " + targetRowIdx
          });
        } else {
          // For band member, clear the year column so member remains with status Unpaid!
          if (yearColIdx !== -1) {
            lavSheet.getRange(targetRowIdx, yearColIdx).setValue("");
          }
          return createJsonResponse({
            success: true,
            message: "Member contribution cleared for " + targetYear + " (status Unpaid) at row " + targetRowIdx
          });
        }
      }

      return createJsonResponse({ success: false, message: "Record not found in Lavajam Details to delete." });
    }

    // ------------------------------------------------------------------------
    // ACTION: addExpense
    // ------------------------------------------------------------------------
    if (action === "addExpense") {
      var expSheet = ss.getSheetByName("Instrument Expenses");
      if (!expSheet) {
        expSheet = ss.insertSheet("Instrument Expenses");
        expSheet.appendRow(["Date", "Expense Details", "Amount"]);
      }
      var exp = body.expense || body;
      var dateVal = String(exp.date || "").trim();
      var detailsVal = String(exp.expenseDetails || exp.name || "").trim();
      var amountVal = Number(exp.amount || 0);

      expSheet.appendRow([dateVal, detailsVal, amountVal]);
      return createJsonResponse({
        success: true,
        message: "Expense '" + detailsVal + "' recorded in Instrument Expenses sheet."
      });
    }

    // ------------------------------------------------------------------------
    // ACTION: updateExpense
    // ------------------------------------------------------------------------
    if (action === "updateExpense") {
      var expSheet = ss.getSheetByName("Instrument Expenses");
      if (!expSheet) return createJsonResponse({ error: "Instrument Expenses sheet not found." });
      var exp = body.expense || body;
      var targetDetails = String(exp.originalDetails || exp.expenseDetails || "").trim().toLowerCase();
      var dateVal = String(exp.date || "").trim();
      var detailsVal = String(exp.expenseDetails || "").trim();
      var amountVal = Number(exp.amount || 0);

      var data = expSheet.getDataRange().getValues();
      var targetRow = -1;
      if (body.rowIndex && body.rowIndex > 1 && body.rowIndex <= data.length) {
        targetRow = body.rowIndex;
      } else {
        for (var r = 1; r < data.length; r++) {
          var rowDetails = String(data[r][1] || "").trim().toLowerCase();
          if (rowDetails === targetDetails) {
            targetRow = r + 1;
            break;
          }
        }
      }

      if (targetRow > 0) {
        if (dateVal) expSheet.getRange(targetRow, 1).setValue(dateVal);
        if (detailsVal) expSheet.getRange(targetRow, 2).setValue(detailsVal);
        if (amountVal) expSheet.getRange(targetRow, 3).setValue(amountVal);
        return createJsonResponse({
          success: true,
          message: "Expense updated at row " + targetRow
        });
      } else {
        expSheet.appendRow([dateVal, detailsVal, amountVal]);
        return createJsonResponse({
          success: true,
          message: "Expense appended in Instrument Expenses sheet."
        });
      }
    }

    // ------------------------------------------------------------------------
    // ACTION: deleteExpense
    // ------------------------------------------------------------------------
    if (action === "deleteExpense") {
      var expSheet = ss.getSheetByName("Instrument Expenses");
      if (!expSheet) return createJsonResponse({ error: "Instrument Expenses sheet not found." });
      var targetDetails = String(body.expenseDetails || body.name || "").trim().toLowerCase();
      var data = expSheet.getDataRange().getValues();
      var deleteRow = -1;
      if (body.rowIndex && body.rowIndex > 1 && body.rowIndex <= data.length) {
        deleteRow = body.rowIndex;
      } else {
        for (var r = 1; r < data.length; r++) {
          var rowDetails = String(data[r][1] || "").trim().toLowerCase();
          if (rowDetails === targetDetails) {
            deleteRow = r + 1;
            break;
          }
        }
      }

      if (deleteRow > 0) {
        expSheet.deleteRow(deleteRow);
        return createJsonResponse({
          success: true,
          message: "Expense removed from row " + deleteRow
        });
      }
      return createJsonResponse({ success: false, message: "Expense not found in Instrument Expenses." });
    }

    return createJsonResponse({ error: "Unknown action: " + action });
  } catch (err) {
    return createJsonResponse({ error: err.toString() });
  }
}

/**
 * Utility: Dynamically maps header names to column zero-based indices
 */
function mapHeaders(headerRow) {
  var map = {
    its: -1,
    name: -1,
    address: -1,
    phone: -1,
    jamaat: -1,
    role: -1,
    username: -1,
    password: -1,
    sno: -1
  };

  for (var i = 0; i < headerRow.length; i++) {
    var raw = String(headerRow[i] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (raw.indexOf("its") !== -1 && map.its === -1) {
      map.its = i;
    } else if ((raw.indexOf("fullname") !== -1 || (raw.indexOf("name") !== -1 && raw.indexOf("user") === -1)) && map.name === -1) {
      map.name = i;
    } else if (raw.indexOf("address") !== -1 && map.address === -1) {
      map.address = i;
    } else if ((raw.indexOf("mobile") !== -1 || raw.indexOf("phone") !== -1 || raw.indexOf("contact") !== -1) && map.phone === -1) {
      map.phone = i;
    } else if (raw.indexOf("jamaat") !== -1 && map.jamaat === -1) {
      map.jamaat = i;
    } else if ((raw.indexOf("role") !== -1 || raw.indexOf("instrument") !== -1) && map.role === -1) {
      map.role = i;
    } else if ((raw.indexOf("user") !== -1 || raw.indexOf("email") !== -1) && map.username === -1) {
      map.username = i;
    } else if ((raw.indexOf("password") !== -1 || raw.indexOf("pass") !== -1) && map.password === -1) {
      map.password = i;
    } else if ((raw.indexOf("sno") !== -1 || raw.indexOf("serial") !== -1) && map.sno === -1) {
      map.sno = i;
    }
  }

  // Fallbacks if columns weren't matched by name
  if (map.its === -1 && headerRow.length >= 1) map.its = 0;
  if (map.name === -1 && headerRow.length >= 2) map.name = 1;
  if (map.address === -1 && headerRow.length >= 3) map.address = 2;
  if (map.phone === -1 && headerRow.length >= 4) map.phone = 3;
  if (map.jamaat === -1 && headerRow.length >= 5) map.jamaat = 4;
  if (map.role === -1 && headerRow.length >= 6) map.role = 5;
  if (map.username === -1 && headerRow.length >= 7) map.username = 6;

  return map;
}

/**
 * Utility: Creates a standard JSON output response
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
