var MAX_COLUMN_INDEX = 21;
var MAX_ROW_INDEX = 100;

function getHeaders() {
  return {
    "Content-Type": 'application/json; charset=UTF-8',
    "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN
  };
}
