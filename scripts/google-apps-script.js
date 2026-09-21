/**
 * Google Apps Script for Taheri Scout Band Group - Member Details Integration
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1OwHHmLqRnzYa930ii3lxCvK0030Uy5atIP161C-QVLs/edit
 * 2. Click on "Extensions" > "Apps Script".
 * 3. Delete any code in the editor and paste this entire script.
 * 4. Click "Deploy" (top right) > "New deployment".
 * 5. Select type: "Web app".
 * 6. Under "Execute as", select "Me (your account)".
 * 7. Under "Who has access", select "Anyone".
 * 8. Click "Deploy" and copy the Web App URL (e.g. https://script.google.com/macros/s/.../exec).
 * 9. Paste this URL into your .env file as:
 *    GOOGLE_SHEET_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = (e && e.parameter && e.parameter.sheet) || "Member Details";
    var sheet = ss.getSheetByName(sheetName) || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0].map(function(h) {
      return String(h).trim();
    });
    
    var items = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var item = {};
      for (var j = 0; j < headers.length; j++) {
        item[headers[j]] = row[j];
      }
      items.push(item);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: items, members: items }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "updatePassword") {
      var sheet = ss.getSheetByName(body.sheetName || "Member Details") || ss.getSheets()[0];
      var username = String(body.username).trim().toLowerCase();
      var newPassword = String(body.newPassword);
      var data = sheet.getDataRange().getValues();
      var headers = data[0].map(function(h) {
        return String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      });
      
      var usernameCol = headers.indexOf("username");
      if (usernameCol === -1) usernameCol = headers.indexOf("email");
      var passwordCol = headers.indexOf("password");
      if (passwordCol === -1) passwordCol = headers.indexOf("pass");
      
      if (usernameCol === -1 || passwordCol === -1) {
        return ContentService.createTextOutput(JSON.stringify({
          error: "Columns 'Username' (or 'Email') and 'Password' must exist in Member Details sheet."
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var foundRow = -1;
      for (var i = 1; i < data.length; i++) {
        var cellVal = String(data[i][usernameCol]).trim().toLowerCase();
        if (cellVal === username) {
          foundRow = i + 1; // 1-based index in Apps Script
          break;
        }
      }
      
      if (foundRow > 0) {
        sheet.getRange(foundRow, passwordCol + 1).setValue(newPassword);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Password successfully updated in Google Sheet for " + username
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({
          error: "Username " + username + " not found in Member Details sheet."
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    if (action === "updateAttendance") {
      var attSheet = ss.getSheetByName("Attendance Details");
      if (!attSheet) {
        attSheet = ss.insertSheet("Attendance Details");
        attSheet.appendRow(["ITS Number", "Member Name", "Section"]);
      }
      
      var dateStr = String(body.date || new Date().toISOString().split('T')[0]);
      var attData = attSheet.getDataRange().getValues();
      var attHeaders = attData[0].map(function(h) { return String(h).trim(); });
      
      // Find or append date column at the top header row
      var dateColIndex = attHeaders.indexOf(dateStr);
      if (dateColIndex === -1) {
        dateColIndex = attHeaders.length;
        attSheet.getRange(1, dateColIndex + 1).setValue(dateStr);
      }
      
      var records = body.records || [];
      // Build index of member names in column 2 (Member Name)
      var nameRowMap = {};
      for (var r = 1; r < attData.length; r++) {
        var nameInSheet = String(attData[r][1] || '').trim().toLowerCase();
        if (nameInSheet) {
          nameRowMap[nameInSheet] = r + 1;
        }
      }
      
      for (var k = 0; k < records.length; k++) {
        var rec = records[k];
        var memberName = String(rec.name || rec.userName || '').trim();
        var memberKey = memberName.toLowerCase();
        var statusVal = rec.status || 'Present'; // Present, Absent, Late
        
        var targetRow = nameRowMap[memberKey];
        if (!targetRow) {
          // Add new member row if not existing
          var newRow = [rec.itsNumber || '', memberName, rec.section || ''];
          attSheet.appendRow(newRow);
          targetRow = attSheet.getLastRow();
          nameRowMap[memberKey] = targetRow;
        }
        
        // Write status (Present, Absent, or Late) in the date column
        attSheet.getRange(targetRow, dateColIndex + 1).setValue(statusVal);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Attendance recorded for " + dateStr + " in Attendance Details sheet (" + records.length + " members)."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ error: "Unknown action: " + action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
