function executeProcessAndReply(e) {
  let webhookData;
  let replyToken;
  let userMessage;

  // LINEメッセージから実行された場合
  if (e && e.postData && e.postData.contents) {
    webhookData = JSON.parse(e.postData.contents).events[0];
    replyToken = webhookData.replyToken;
    userMessage = webhookData.message.text;
  } else {
    // トリガーから実行された場合
    // 実行された日時を取得
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    userMessage = year + "-" + month + "-" + day;

    // 翌日の日付を取得
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = nextDate.getMonth() + 1;
    const nextDay = nextDate.getDate();
    
    // 検索用のクエリ作成
    userMessage = `${nextYear}-${nextMonth}-${nextDay} ${SYSTEM_WORD.SERCH_WORDS}`;
  }

  // メッセージに「配車」という文字が含まれているかチェック
  if (!userMessage.includes(SYSTEM_WORD.SERCH_WORDS)) {
    return;
  }

  try {
    // 入力されたメッセージから適切な日付形式にして取得する
    const dateInfo = extractDateFromMessage(userMessage);
    if (!dateInfo) {
      var errorMessage = MESSAGE.DATE_FORMAT_ERROR;
      if (replyToken) {
        sendDebugMessage(errorMessage, replyToken);
      }
      return;
    }
    // 送迎情報を取得する
    const result = getCountOfSpecificCondition(dateInfo.year, dateInfo.month, dateInfo.day);
    if (!result) {
      return;
    }

    // 迎え、送り、自由記述欄に分けて格納
    let pickupLocationMap = result.pickupLocationMap;
    let dropoffLocationMap = result.dropoffLocationMap;
    let freetoday = result.freetoday
    // console.log("迎えMap: " + JSON.stringify(Array.from(pickupLocationMap.entries())));
    // console.log("送りMap: " + JSON.stringify(Array.from(dropoffLocationMap.entries())));
    // console.log("当日の自由記入欄"+ result.freetoday)

    // 取得するデータを制御
    let showAM = userMessage.includes("午前") || !userMessage.includes("午後");
    let showPM = userMessage.includes("午後") || !userMessage.includes("午前");

    // 優先順位(午前午後、送り迎え、送迎場所)に基づき取得したデータ（Map）のデータを整形（カテゴリ分け）
    const groupedData = formatLocationData(pickupLocationMap, dropoffLocationMap);
    
    // LINEで返す文字列を整形する
    const replyText = generateReplyText(dateInfo, groupedData, freetoday, showAM, showPM, userMessage);
    if (replyToken) {
      sendLineMessageFromReplyToken(replyToken, replyText);
    } else {
      sendLineMessageToUser(replyText);
    }
  } catch (error) {
    const errorMessage = EXECUTEPROCESS_ERROR + error.message;
    if (replyToken) {
      sendDebugMessage(errorMessage, replyToken);
    } else {
      sendLineMessageToUser(errorMessage);
    }
  }
}

// 前日の日付を取得
function getPreviousDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  };
}

// pickupLocationMap（迎え）とdropoffLocationMap（送り）のデータを午前、午後、特別に分類して返す関数
function formatLocationData(pickupLocationMap, dropoffLocationMap) {
  // カテゴリを用意
  const groupedData = { am: { dropoff: [], pickup: [] }, pm: { dropoff: [], pickup: [] }, special: { dropoff: [], pickup: [] } };
  // 午前と午後の定義
  const amTimePattern = /午前|09(15|30|40)/;
  const pmTimePattern = /午後|13(00|30)|14(00|30)|15(00|30)|1600/;

  // 迎え のデータを処理
  pickupLocationMap.forEach((dataArray, location) => {
    dataArray.forEach(row => {
      let hasPickup = false;
      let isPickupAM = false;
      let isPickupPM = false;
      let isSpecial = false;

      // 迎えが有効か
      if (row.pickupTime && row.pickupTime !== NOT_PICK) {
        hasPickup = true;

        // 午前、午後、特別カテゴリの判定
        if (amTimePattern.test(row.pickupTime)) {
          isPickupAM = true;
        } else if (pmTimePattern.test(row.pickupTime)) {
          isPickupPM = true;
        } else {
          isSpecial = true;
        }
      }

      if (hasPickup) {
        // カテゴリを判定
        let category = "special";
        if (isPickupAM) {
          category = "am";
        } else if (isPickupPM) {
          category = "pm";
        }

        // 該当するカテゴリに追加
        groupedData[category].pickup.push({ location, ...row });
      }
    });
  });

  // 送り のデータを処理
  dropoffLocationMap.forEach((dataArray, location) => {
    dataArray.forEach(row => {
      let hasDropoff = false;
      let isDropoffAM = false;
      let isDropoffPM = false;
      let isSpecial = false;

      // 送りが有効か
      if (row.dropoffTime && row.dropoffTime !== NOT_PICK) {
        hasDropoff = true;

        // 午前、午後、特別カテゴリの判定
        if (amTimePattern.test(row.dropoffTime)) {
          isDropoffAM = true;
        } else if (pmTimePattern.test(row.dropoffTime)) {
          isDropoffPM = true;
        } else {
          isSpecial = true;
        }
      }

      if (hasDropoff) {
        // カテゴリを判定
        let category = "special"; // デフォルトで特別カテゴリ
        if (isDropoffAM) {
          category = "am";
        } else if (isDropoffPM) {
          category = "pm";
        }

        // 該当するカテゴリに追加
        groupedData[category].dropoff.push({ location, ...row });
      }
    });
  });

  return groupedData;
}

// 送迎データを基に返信メッセージを生成する関数
// 自由記述欄の情報を取得して送信する関数
function generateReplyText(dateInfo, groupedData, freetoday, showAM, showPM, userMessage) {
    let replyText = '';
    let timemark = '';
    let othersdata = false; //送迎場所=その他→→→true

    // 共通処理用の関数
    const processCategory = (category, title) => {
        const hasDropoffData = groupedData[category].dropoff.length > 0;
        const hasPickupData = groupedData[category].pickup.length > 0;

        if (hasDropoffData || hasPickupData) {
            replyText += `◇◆ ${dateInfo.month}月${dateInfo.day}日 ${title} ◆◇\n\n`;
        }

        if (hasDropoffData) {
            const { text, hasOthers } = formatLocationGroup(groupedData[category].dropoff, "送り");
            replyText += text;
            if (hasOthers) othersdata = true;
        }

        if (hasPickupData) {
            const { text, hasOthers } = formatLocationGroup(groupedData[category].pickup, "迎え");
            replyText += text;
            if (hasOthers) othersdata = true;
        }
    };

    // 午前情報の表示
    if (showAM) {
        processCategory("am", "午前");
    }

    // 午後情報の表示
    if (showPM) {
        processCategory("pm", "午後");
    }

    // 特別情報の表示
    processCategory("special", "送迎時間不明");

    // 自由記述欄の内容をLINEメッセージに追加
    console.log("freetoday 全体の中身: " + JSON.stringify(freetoday));

    if (freetoday && freetoday.some(row => row[0] && row[0].trim() !== '')) {
        replyText += `◇◆ ${自由記述欄の送迎情報} ◆◇\n`;
        freetoday.forEach(row => {
            if (row[0] && row[0].trim() !== '') {
                replyText += `${row[0]}\n`;
            }
        });
        replyText += `\n`;
    }

    // 自由記述欄とその他の情報を追加
    if (othersdata === true) {
        replyText += `◇◆ ${CHECK_CLOUD_MEMO}\n`;
    }

    // 送迎がない場合
    if (replyText === '') {
        if (userMessage.includes("午前")) {
            timemark = "午前";
        } else if (userMessage.includes("午後")) {
            timemark = "午後";
        }
      replyText += `${dateInfo.month}月${dateInfo.day}日 ${timemark} ${MESSAGE.NO_PICKUP}`;
      
    }
    return replyText;
}


// 送迎データを送迎場所（ロケーション）ごとにグループ化し、フォーマットされたテキストを生成する関数
function formatLocationGroup(dataArray, type) {
  let text = `【${type}】（計${dataArray.reduce((sum, entry) => sum + (parseInt(entry.membernum) || 0), 0)}名）\n`;
  text += `====================\n`;
  let hasOthers = false;

  // console.log("reduceの動作確認"+JSON.stringify(dataArray, null, 2));
  const locationGroups = dataArray.reduce((acc, entry) => {
    let locationString = entry.location.toString();
    if (!acc[locationString]) acc[locationString] = [];
    acc[locationString].push(entry);

    return acc;
  }, {});

  for (const location in locationGroups) {
    const entries = locationGroups[location];
    const totalLocationPeople = entries.reduce((sum, entry) => sum + (parseInt(entry.membernum) || 0), 0);
    text += `■ ${location}（${totalLocationPeople}名）\n`;
    if (location === SHEET_VALUE.OTHER) {
      hasOthers = true;
    }

    entries.forEach(entry => {
      const men = entry.men || 0;
      const women = entry.women || 0;
      const lodgeMark = entry.lodge === LODGE_NAME.NEISI ? "※根石" : entry.lodge === LODGE_NAME.IOU ? "※硫黄" : "";
      text += ` ・${entry.name} 様 ${entry.membernum}名(${men},${women})${lodgeMark}\n`;
      text += `　${entry.pohonenum}\n`; // 電話番号を次の行に追加
    });
  }
  text += `\n`;
  return { text, hasOthers };
}


// メッセージから日付情報を抽出、整形
function extractDateFromMessage(message) {
  // 様々な日付パターンでも日付を抽出する
  // 2025-1-4とか1/4とか2025年1月4とかから日付を抽出するための正規表現
  const datePattern = /(?:(\d{4})[\/\-年])?(\d{1,2})[\/\-月]?(\d{1,2})?日?/;
  const match = message.match(datePattern);

  if (match) {
    const currentDate = new Date();// 現在の日付
    const currentYear = currentDate.getFullYear(); // 現在の年
    const currentMonth = currentDate.getMonth() + 1; // 現在の月
    
    // 入力された日付から年、月、日を取得（指定がなければ現在の値を補完）
    const year = match[1] ? parseInt(match[1]) : currentYear;
    const month = match[2] ? parseInt(match[2]) : currentMonth;
    const day = match[3] ? parseInt(match[3]) : today.getDate();

    // 最終的に補完された日付を返す
    return { year: year, month: month, day: day };
  }
  return null;
}


/**
 * 送迎情報を取得する関数
 * 当日のシートから迎え情報、前日のシートから送り情報、両方から自由記入欄の情報を取得する
 */
function getCountOfSpecificCondition(year, month, day) {

  let dropoffLocationMap = new Map(); //送り（前日から）
  let pickupLocationMap = new Map(); //迎え（当日から）
  let freetoday //自由記述欄（当日から）
  
  prevDate = getPreviousDate(year, month, day); // 前日の日付を取得

  // 検索する山荘
  const lodgeNames = [LODGE_NAME.NATUZAWA, LODGE_NAME.NEISI, LODGE_NAME.IOU];

  // 山荘ごとに取得する
  for (const lodgeName of lodgeNames) {
    const bookName = lodgeName + "_" + year + "-" + month + "月"; // 当日のブック名
    const prevBookName = lodgeName + "_" + prevDate.year + "-" + prevDate.month + "月"; // 前日のブック名

    let folderPas = ""
    if (lodgeName === LODGE_NAME.NATUZAWA) {
      folderPas = LODGE_PATH.NATUZAWA_PATH

    } else if (lodgeName === LODGE_NAME.NEISI) {
      folderPas = LODGE_PATH.NEISI_PATH 

    } else if (lodgeName === LODGE_NAME.IOU) {
      folderPas = LODGE_PATH.IOU_PATH
    }
    var book = getSpreadsheetByName(folderPas , bookName);
    if (!book) {
      sendDebugMessage(MESSAGE.BOOK_NOT_FOUND(bookName));
      return null;
      
    } else {
      // 検索するシート名の作成
      const targetDate = new Date(year, month - 1, day);
      const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];
      const dayOfWeek = daysOfWeek[targetDate.getDay()];
      const sheetName = day + "（" + dayOfWeek + "）";
      const sheet = book.getSheetByName(sheetName);

      if (!sheet) {
        sendDebugMessage(SHEET_NOT_FOUND(sheetName));
      } else {

        // 当日のシートから、迎え情報を取得する
        extractSheetDatatoday(book, sheetName, pickupLocationMap, lodgeName);

        // 夏沢のみ当日のシートから自由記入欄の内容を取得する
        if (lodgeName === LODGE_NAME.NATUZAWA) {
          freetoday = extractfreeDatatoday(book, sheetName);
        }
      }
    }

    // 前日
    const prevFiles = getSpreadsheetByName(folderPas , prevBookName);
    if (!prevFiles) {
      sendDebugMessage(MESSAGE.NOT_FOUND_PREV_BOOK + prevBookName);
    } else {
      // 検索するシート名の作成
      const prevTargetDate = new Date(prevDate.year, prevDate.month - 1, prevDate.day);
      const prevDayOfWeek = daysOfWeek[prevTargetDate.getDay()];
      const prevSheetName = prevDate.day + "（" + prevDayOfWeek + "）";
      const prevSheet = prevFiles.getSheetByName(prevSheetName);
      if (!prevSheet) {
        sendDebugMessage(MESSAGE.NOT_FOUND_PREV_SHEET + prevSheetName);
      } else {
        // 前日のシートから、迎え情報を取得する
        extractSheetDatayestaday(prevFiles, prevSheetName, dropoffLocationMap, lodgeName);
      }
    }
  };
  return { pickupLocationMap: pickupLocationMap, dropoffLocationMap: dropoffLocationMap, freetoday : freetoday};
}

/**
 * 当日シートから迎え情報を取得する
 */
function extractSheetDatatoday(spreadsheet, sheetName, pickupLocationMap, lodgeName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return;
  let values = sheet.getDataRange().getValues();
  let targetColumns = {};

  // 取得する項目の列インデックスの検索
  for (var i = 0; i < MAX_COLUMN_INDEX; i++) {
  // 各セルの値を確認する
  if (values[6][i] === PICK_LOCATION) {
    targetColumns.pickupLocation = i;
  } else if (values[6][i] === PICKUP_TIME) {
    targetColumns.pickupTime = i;
  } else if (values[6][i] === NAME) {
    targetColumns.name = i;
  } else if (values[6][i] === MEMBER_NUM) {
    targetColumns.membernum = i;
  } else if (values[6][i] === MALE) {
    targetColumns.men = i;
  } else if (values[6][i] === FEMALE) {
    targetColumns.women = i;
  } else if (values[6][i] === STATUS) {
    targetColumns.status = i;
  } else if (values[6][i] === REMARK) {
    targetColumns.memo = i;
  } else if (values[6][i] === PHONE_NUMBER) {
    targetColumns.pohonenum = i;
  }
}

  // 備考の列インデックスまじで取得できない
  targetColumns.memo = 20

  // キャンセルされた予約は除外
  for (const j = 7; j < MAX_ROW_INDEX; j++) {
    if (values[j][targetColumns.status] !== RESERVE) {
      continue;
    }

    // 「送迎場所」に値が存在する行のみ送迎情報を取得する
    let pickupLocationValue = values[j][targetColumns.pickupLocation];
    if (pickupLocationValue !== NOT_PICK && pickupLocationValue !== "") {

      
      let rowData = {
        name: values[j][targetColumns.name],
        membernum: values[j][targetColumns.membernum],
        men: values[j][targetColumns.men],
        women: values[j][targetColumns.women],
        pickupLocation: pickupLocationValue,
        pickupTime: targetColumns.pickupTime ? values[j][targetColumns.pickupTime] : null,
        pohonenum: values[j][targetColumns.pohonenum],
        lodge: lodgeName
      };

      // 送迎情報をMapオブジェクト(キーと値)で保存する
      // pickupLocationValue(送迎場所)をキーとする
      // 同じキー(送迎場所)が無ければ新しくキーを作成する
      if (!pickupLocationMap.has(pickupLocationValue)) {
        // キーに対してからの配列を用意しておく
        pickupLocationMap.set(pickupLocationValue, []);
      }
      // 同じキーにrowDataを格納する
      // ↓
      // 送迎場所ごとに送迎情報を管理することができる
      pickupLocationMap.get(pickupLocationValue).push(rowData);
    }
  }
}


// 当日シートから自由記入欄の情報を取得する
function extractfreeDatatoday(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);//検索するシートの設定
  const rangeValues = sheet.getRange(FREE_NOTE_RANGE).getValues();
  return rangeValues;
}

/**
 * 前日シートからの取得
 */
// 前日シートから送り情報を取得する
function extractSheetDatayestaday(spreadsheet, sheetName, dropoffLocationMap, lodgeName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  const targetColumns = {};

  // カラムインデックスの特定
for (var i = 0; i < MAX_COLUMN_INDEX; i++) {
  if (values[6][i] === PICK_LOCATION) targetColumns.pickupLocation = i;
  else if (values[6][i] === DROPOFF_TIME) targetColumns.dropoffTime = i;
  else if (values[6][i] === NAME) targetColumns.name = i;
  else if (values[6][i] === MEMBER_NUM) targetColumns.membernum = i;
  else if (values[6][i] === MALE) targetColumns.men = i;
  else if (values[6][i] === FEMALE) targetColumns.women = i;
  else if (values[6][i] === PHONE_NUMBER) targetColumns.pohonenum = i;
  else if (values[6][i] === STATUS) targetColumns.status = i;
}

  // データの抽出とマップへの追加
  for (var j = 7; j < MAX_ROW_INDEX; j++) {
    if (values[j][targetColumns.status] !== RESERVE) continue;

    const pickupLocationValue = values[j][targetColumns.pickupLocation];
    if (pickupLocationValue !== NOT_PICK && pickupLocationValue !== "") {
      var rowData = {
        name: values[j][targetColumns.name],
        membernum: values[j][targetColumns.membernum],
        men: values[j][targetColumns.men],
        women: values[j][targetColumns.women],
        pickupLocation: pickupLocationValue,
        dropoffTime: values[j][targetColumns.dropoffTime],
        pohonenum: values[j][targetColumns.pohonenum],
        lodge: lodgeName
      };      
      
      if (!dropoffLocationMap.has(pickupLocationValue)) {
        dropoffLocationMap.set(pickupLocationValue, []);
      }
      dropoffLocationMap.get(pickupLocationValue).push(rowData);
    }
  }
}

// 受け取ったメッセージに対して返信する
function doPost(e) {
  try {
    const webhookData = JSON.parse(e.postData.contents).events[0];
    const userId = webhookData.source.userId;
    PropertiesService.getScriptProperties().setProperty('LINE_USER_ID', userId);
    return executeProcessAndReply(e);
  } catch (error) {
    const replyToken = JSON.parse(e.postData.contents).events[0].replyToken;
    sendDebugMessage("エラーが発生しました: " + error.message, replyToken);
  }
}