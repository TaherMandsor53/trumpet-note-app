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
    // ACTION: updateAttendance
    // ------------------------------------------------------------------------
    if (action === "updateAttendance") {
      var attSheet = ss.getSheetByName("Attendance Details");
      if (!attSheet) {
        attSheet = ss.insertSheet("Attendance Details");
        attSheet.appendRow(["ITS Number", "Member Name", "Section"]);
      }

      var dateStr = String(body.date || new Date().toISOString().split("T")[0]);
      var attData = attSheet.getDataRange().getValues();
      var attHeaders = attData[0].map(function(h) { return String(h).trim(); });

      var dateColIndex = attHeaders.indexOf(dateStr);
      if (dateColIndex === -1) {
        dateColIndex = attHeaders.length;
        attSheet.getRange(1, dateColIndex + 1).setValue(dateStr);
      }

      var records = body.records || [];
      var nameRowMap = {};
      for (var r = 1; r < attData.length; r++) {
        var nameInSheet = String(attData[r][1] || "").trim().toLowerCase();
        if (nameInSheet) {
          nameRowMap[nameInSheet] = r + 1;
        }
      }

      for (var k = 0; k < records.length; k++) {
        var rec = records[k];
        var memberName = String(rec.name || rec.userName || "").trim();
        var memberKey = memberName.toLowerCase();
        var statusVal = rec.status || "Present";

        var targetRow = nameRowMap[memberKey];
        if (!targetRow) {
          var newAttRow = [rec.itsNumber || "", memberName, rec.section || ""];
          attSheet.appendRow(newAttRow);
          targetRow = attSheet.getLastRow();
          nameRowMap[memberKey] = targetRow;
        }

        attSheet.getRange(targetRow, dateColIndex + 1).setValue(statusVal);
      }

      return createJsonResponse({
        success: true,
        message: "Attendance recorded for " + dateStr + " in Attendance Details sheet (" + records.length + " members)."
      });
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
