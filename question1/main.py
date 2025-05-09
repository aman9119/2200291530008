from fastapi import FastAPI, HTTPException, Query
from typing import List, Dict, Any
import requests
import time
import threading

app = FastAPI()

API_BASE = "http://20.244.56.144/evaluation-service"
EMAIL = ""
NAME = ""
ROLLNO = ""
ACCESS_CODE = ""
CLIENT_ID = ""
CLIENT_SECRET = ""
TOKEN = ""
TOKEN_EXPIRY = 0
TOKEN_LOCK = threading.Lock()

CACHE = {}
CACHE_TTL = 60

def get_token():
    global TOKEN, TOKEN_EXPIRY
    with TOKEN_LOCK:
        if TOKEN and TOKEN_EXPIRY > time.time():
            return TOKEN
        payload = {
            "email": EMAIL,
            "name": NAME,
            "rollNo": ROLLNO,
            "accessCode": ACCESS_CODE,
            "clientID": CLIENT_ID,
            "clientSecret": CLIENT_SECRET
        }
        r = requests.post(f"{API_BASE}/auth", json=payload)
        if r.status_code == 200:
            data = r.json()
            TOKEN = data["access_token"]
            TOKEN_EXPIRY = time.time() + 60 * 50
            return TOKEN
        raise HTTPException(status_code=500, detail="Auth failed")

def fetch_api(url):
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        return r.json()
    raise HTTPException(status_code=r.status_code, detail=r.text)

def cache_get(key):
    v = CACHE.get(key)
    if v and v[1] > time.time():
        return v[0]
    return None

def cache_set(key, value):
    CACHE[key] = (value, time.time() + CACHE_TTL)

def get_price_history(ticker: str, minutes: int):
    key = f"{ticker}:{minutes}"
    cached = cache_get(key)
    if cached:
        return cached
    url = f"{API_BASE}/stocks/{ticker}?minutes={minutes}"
    data = fetch_api(url)
    cache_set(key, data)
    return data

def average(prices):
    if not prices:
        return 0
    return sum(x["price"] for x in prices) / len(prices)

def stddev(prices, avg):
    if not prices:
        return 0
    return (sum((x["price"]-avg)**2 for x in prices)/len(prices))**0.5

def align_histories(h1, h2):
    t1 = {x["lastUpdatedAt"]: x["price"] for x in h1}
    t2 = {x["lastUpdatedAt"]: x["price"] for x in h2}
    common = set(t1.keys()) & set(t2.keys())
    l1 = [t1[t] for t in sorted(common)]
    l2 = [t2[t] for t in sorted(common)]
    return l1, l2

def correlation(l1, l2):
    n = len(l1)
    if n < 2:
        return 0
    avg1 = sum(l1)/n
    avg2 = sum(l2)/n
    cov = sum((l1[i]-avg1)*(l2[i]-avg2) for i in range(n))/(n-1)
    std1 = (sum((x-avg1)**2 for x in l1)/(n-1))**0.5
    std2 = (sum((x-avg2)**2 for x in l2)/(n-1))**0.5
    if std1 == 0 or std2 == 0:
        return 0
    return cov/(std1*std2)

@app.get("/stocks/{ticker}")
def get_stock_average(ticker: str, minutes: int = Query(...), aggregation: str = Query("average")):
    data = get_price_history(ticker, minutes)
    if not isinstance(data, list):
        prices = [data["stock"]]
    else:
        prices = data
    avg = average(prices)
    return {"averageStockPrice": avg, "priceHistory": prices}

@app.get("/stockcorrelation")
def get_stock_correlation(minutes: int = Query(...), ticker: List[str] = Query(...)):
    if len(ticker) != 2:
        raise HTTPException(status_code=400, detail="Exactly 2 tickers required")
    h1 = get_price_history(ticker[0], minutes)
    h2 = get_price_history(ticker[1], minutes)
    if not isinstance(h1, list):
        h1 = [h1["stock"]]
    if not isinstance(h2, list):
        h2 = [h2["stock"]]
    l1, l2 = align_histories(h1, h2)
    corr = correlation(l1, l2)
    avg1 = average(h1)
    avg2 = average(h2)
    return {
        "correlation": round(corr, 4),
        "stocks": {
            ticker[0]: {"averagePrice": avg1, "priceHistory": h1},
            ticker[1]: {"averagePrice": avg2, "priceHistory": h2}
        }
    }
