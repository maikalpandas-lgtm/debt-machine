import urllib.request
import urllib.parse
import json
import time

BOT_TOKEN = "8716982972:AAG2uhOuzNpEyz1FFnMprxJQRfG6wcYqwMQ"
WEBAPP_URL = "https://maikalpandas-lgtm.github.io/debt-machine/"

def send_message(chat_id, text, reply_markup=None):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    urllib.request.urlopen(req)

def main():
    print("Бот запущен и ждёт команду /start...")
    offset = 0
    while True:
        try:
            url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates?timeout=30&offset={offset}"
            with urllib.request.urlopen(url) as response:
                res = json.loads(response.read().decode())
            
            if res.get("ok"):
                for update in res["result"]:
                    offset = update["update_id"] + 1
                    
                    if "message" in update and "text" in update["message"]:
                        chat_id = update["message"]["chat"]["id"]
                        text = update["message"]["text"]
                        
                        if text.startswith("/start") or text.startswith("/play"):
                            reply_markup = {
                                "inline_keyboard": [[
                                    {"text": "🎰 ИГРАТЬ СЕЙЧАС", "web_app": {"url": WEBAPP_URL}}
                                ]]
                            }
                            send_message(
                                chat_id, 
                                "Добро пожаловать в **Debt Machine**! 💀\n\nВыплати свой долг или отправляйся в яму. Жми кнопку ниже, чтобы начать смену на автомате:", 
                                reply_markup
                            )
        except Exception as e:
            print("Ошибка:", e)
            time.sleep(5)

if __name__ == "__main__":
    main()
