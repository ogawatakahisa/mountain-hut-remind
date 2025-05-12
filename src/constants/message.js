var MESSAGE = {
  NO_PICKUP: 'は送迎はありません。',
  DATE_FORMAT_ERROR: '正しい日付形式が入力されていません。',
  SHEET_NOT_FOUND: (name) => `指定された日付のシートが見つかりませんでした。シート名: ${name}`,
  BOOK_NOT_FOUND: (name) => `指定された予約表が見つかりませんでした。ブック名: ${name}`,
  CHECK_CLOUD_MEMO: '◇◆ 詳細をクラウド備考欄で確認下さい。',
  FREE_NOTE_HEADER: '◇◆ 自由記述欄の送迎情報 ◆◇',
  EXECUTEPROCESS_ERROR: 'executeProcessAndReplyでエラーが発生しました',
  NOT_FOUND_PREV_BOOK: '前日のブックが見つかりませんでした。ブック名',
  NOT_FOUND_PREV_SHEET: '前日のシートが見つかりませんでした。シート名',
};

var SHEET_VALUE = {
  PICK_LOCATION: '送迎場所',
  DROPOFF_TIME: '送り時間',
  PICKUP_TIME: '迎え時間',
  NAME: '氏名',
  MEMBER_NUM: '人数',
  MALE: '男',
  FEMALE: '女',
  PHONE_NUMBER: '電話番号',
  REMARK: '備考',
  STATUS: '状況',
  NOT_PICK: 'なし',
  RESERVE: '予約',
  FREE_NOTE_RANGE: "K110:K118",
  OTHER: 'その他',
}

var LODGE_NAME = {
  NATUZAWA: '夏沢鉱泉',
  NEISI: '根石岳山荘', 
  IOU: '硫黄岳山荘', 
};

var LODGE_PATH = {
  NATUZAWA_PATH: '00_各山荘予約表/30_夏沢予約表',
  NEISI_PATH: '00_各山荘予約表/20_根石予約表',
  IOU_PATH: '00_各山荘予約表/10_硫黄予約表',
}

var SYSTEM_WORD = {
  SERCH_WORDS: '検索'
}