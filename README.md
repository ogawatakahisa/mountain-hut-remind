# 配車マン

## 概要

**配車マン** は、Google Apps Script と LINE Messaging API を活用した、山小屋の送迎情報自動通知システムです。  
各山荘の予約表（Googleスプレッドシート）に入力された送迎情報を、LINEで自動的に通知・検索できるようにします。

📄 連携スプレッドシート:  
https://docs.google.com/spreadsheets/d/1sW6vYq-gZIcRsv2j5MCcpIxTkj-QvUHOOJOPyBA8rfU/edit?usp=drive_link

## 主な機能

### ✅ 日付指定による送迎情報検索

- LINE メッセージで特定の日付を入力することで、その日の送迎情報を取得できます。
- 対応する日付の入力例：
  - `2024/1/1`
  - `2024-1-1`
  - `2024年1月1日`
- 年や月を省略した場合：
  - 現在の年・月が自動的に補完されます（例：`1日` → `2025年5月1日`）。

---

### ✅ 自動リマインド送信

1日2回、決まった時間帯に送迎情報を自動でLINEに送信します。

| 時間帯       | 通知内容             |
|------------|----------------------|
| 06:00〜07:00 | 当日の全送迎情報       |
| 18:00〜19:00 | 翌日の全送迎情報       |

---

## 表示形式（メッセージ構造）

送迎情報は以下のように分類・表示されます：

1. 【迎え】 or 【送り】
2. 午前 / 午後 / 送迎時間不明
3. 送迎場所ごとにグループ化

### 例
予約表
![EACA8E8E-EB80-4EA3-BD10-8B4EBE239E91_4_5005_c](https://github.com/user-attachments/assets/1466c9a8-53d7-4e24-9e7b-485b79739f5a)
![C6D623EA-0E3E-437B-9F0B-03E3E2271546](https://github.com/user-attachments/assets/9ba4713a-3485-4ef1-915e-1d0ac4f109fc)

![6539334F-F4D6-4423-A920-FD124DA6E2EB_4_5005_c](https://github.com/user-attachments/assets/17652df1-a01c-4707-a8d3-e4cc12b7163d)



---

## システム構成

- LINE Messaging API
- Google Apps Script
- Google Spreadsheet（予約表）
- clasp（開発環境同期）
