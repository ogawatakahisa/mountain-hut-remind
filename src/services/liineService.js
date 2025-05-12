function sendDebugMessage(message, replyToken) {
  if (replyToken) {
    // 有効なreplyTokenがあれば replyMessage で返信
    var url = "https://api.line.me/v2/bot/message/reply";
    var postData = {
      "replyToken": replyToken,
      "messages": [{ "type": "text", "text": message }]
    };
  } else {
    // なければ pushMessage で自分宛に送信
    var url = "https://api.line.me/v2/bot/message/push";
    var postData = {
      "to": SEND_ID,
      "messages": [{ "type": "text", "text": message }]
    };
  }

  var options = {
    "method": "POST",
    headers: getHeaders(), 
    "payload": JSON.stringify(postData)
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (error) {
    Logger.log("LINEメッセージ送信中にエラーが発生しました2: " + error.message);
  }
}

// プッシュ形式の送信
function sendLineMessageToUser(messageText) {
  var url = "https://api.line.me/v2/bot/message/push";

  var postData = {
    "to": SEND_ID,
    "messages": [{ "type": "text", "text": messageText }]
  };
  var options = {
    "method": "POST",
    headers: getHeaders(), 
    "payload": JSON.stringify(postData)
  };
  try {
    UrlFetchApp.fetch(url, options);
  } catch (error) {
    console.log("LINEメッセージ送信中にエラーが発生しました1: " + error.message);
  }
}