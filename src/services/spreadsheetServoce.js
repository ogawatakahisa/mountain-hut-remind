/**
 * 指定フォルダ内からスプレッドシートを検索
 */
function getSpreadsheetByName(folderPath, spreadsheetName) {
  const folderNames = folderPath.split('/');
  let folder = null;

  try {
    // ルートフォルダ
    const rootFolders = DriveApp.getFoldersByName(folderNames[0]);
    if (rootFolders.hasNext()) {
      folder = rootFolders.next();
    } else {
      console.error(`Root folder "${folderNames[0]}" not found.`);
      return null;
    }

    // ネストフォルダ
    for (let i = 1; i < folderNames.length; i++) {
      const folders = folder.getFoldersByName(folderNames[i]);
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        console.error(`Folder "${folderNames[i]}" not found in "${folderNames.slice(0, i).join('/')}".`);
        return null;
      }
    }

    // 指定したフォルダ内のスプレッドシートを検索
    const files = folder.getFilesByName(spreadsheetName);
    while (files.hasNext()) {
      const file = files.next();
      if (file.getMimeType() === "application/vnd.google-apps.spreadsheet") {
        return SpreadsheetApp.openById(file.getId());
      }
    }

    console.error(`Spreadsheet "${spreadsheetName}" not found in folder "${folderPath}".`);
    return null;

  } catch (error) {
    console.error(`Error while searching for spreadsheet: ${error.message}`);
    return null;
  }
}
