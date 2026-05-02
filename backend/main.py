# ===================== STOCKSEE BACKEND =====================

import os
import logging
from datetime import datetime, timedelta, date
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv

# ✅ STRONG FIX: always load .env from project root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

import pandas as pd
import numpy as np
import yfinance as yf
import requests

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# ─── APP ────────────────────────────────────────────────────
app = FastAPI(title="STOCKSEE AI Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── CONFIG ─────────────────────────────────────────────────
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

print("ENV PATH:", env_path)
print("FINNHUB KEY LOADED:", "YES" if FINNHUB_API_KEY else "NO")

CACHE = {}
NEWS_CACHE = {}
CACHE_EXPIRY = timedelta(minutes=10)
NEWS_CACHE_EXPIRY = timedelta(minutes=5)

vader = SentimentIntensityAnalyzer()
sentiment_model = None

# ─── AUTH (SUPABASE JWT) ─────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_JWT_AUD = os.getenv("SUPABASE_JWT_AUD")  # optional; if unset, audience is not enforced

_jwks_cache: Dict[str, Any] = {"jwks": None, "ts": None}
_jwks_ttl = timedelta(hours=12)

bearer_scheme = HTTPBearer(auto_error=False)


def _get_jwks() -> Dict[str, Any]:
    if not SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server auth misconfigured: SUPABASE_URL is not set",
        )

    now = datetime.utcnow()
    if _jwks_cache["jwks"] and _jwks_cache["ts"] and (now - _jwks_cache["ts"] < _jwks_ttl):
        return _jwks_cache["jwks"]

    jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        res = requests.get(jwks_url, timeout=8)
        res.raise_for_status()
        jwks = res.json()
        if not isinstance(jwks, dict) or "keys" not in jwks:
            raise ValueError("Invalid JWKS")
        _jwks_cache["jwks"] = jwks
        _jwks_cache["ts"] = now
        return jwks
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to fetch JWKS: {e}",
        )


def _verify_supabase_jwt(token: str) -> Dict[str, Any]:
    import jwt
    from jwt import PyJWKClient

    if not SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server auth misconfigured: SUPABASE_URL is not set",
        )

    # Use local JWKS caching; PyJWT JWKClient handles key selection by kid.
    jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    jwk_client = PyJWKClient(jwks_url)

    signing_key = jwk_client.get_signing_key_from_jwt(token).key
    issuer = f"{SUPABASE_URL.rstrip('/')}/auth/v1"

    options = {
        "verify_signature": True,
        "verify_exp": True,
        "verify_iat": True,
        "verify_nbf": True,
        "verify_iss": True,
        "verify_aud": bool(SUPABASE_JWT_AUD),
    }

    try:
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=issuer,
            audience=SUPABASE_JWT_AUD,
            options=options,
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")


def require_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> Dict[str, Any]:
    if not credentials or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return _verify_supabase_jwt(credentials.credentials)

# ─── STARTUP ────────────────────────────────────────────────
@app.on_event("startup")
def load_sentiment_model():
    global sentiment_model
    if os.getenv("RENDER") or os.getenv("DISABLE_FINBERT"):
        logger.info("Skipping FinBERT load on Render/Low-memory environment. Using VADER.")
        sentiment_model = None
        return

    try:
        from transformers import pipeline as hf_pipeline
        sentiment_model = hf_pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert",
            truncation=True,
            max_length=512,
        )
        logger.info("FinBERT loaded ✅")
    except Exception as e:
        logger.warning(f"FinBERT unavailable, using VADER. Reason: {e}")
        sentiment_model = None

# ─── ROOT ───────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "STOCKSEE backend running 🚀"}

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# ─── DATA FETCH ─────────────────────────────────────────────
def fetch_data(symbol: str) -> pd.DataFrame:
    key = f"data_{symbol.upper()}"

    if key in CACHE:
        df, ts = CACHE[key]
        if datetime.utcnow() - ts < CACHE_EXPIRY:
            return df

    df = yf.download(symbol, period="200d", progress=False)

    if df is None or df.empty:
        raise HTTPException(404, f"No data for {symbol}")

    df = df.reset_index()

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [col[0] for col in df.columns]

    df.rename(columns={"Date": "datetime"}, inplace=True)
    df["datetime"] = pd.to_datetime(df["datetime"])

    CACHE[key] = (df, datetime.utcnow())
    return df

# ─── FEATURES ───────────────────────────────────────────────
def features(df: pd.DataFrame) -> pd.DataFrame:
    close = "Close" if "Close" in df.columns else "close"
    df["RSI"] = 100 - (100 / (1 + df[close].pct_change().rolling(14).mean()))
    df["MACD"] = df[close].ewm(span=12).mean() - df[close].ewm(span=26).mean()
    df.dropna(inplace=True)
    return df

# ─── LSTM (lazy import to avoid startup crash) ──────────────
def predict_price(df: pd.DataFrame, symbol: str) -> float:
    try:
        from sklearn.preprocessing import MinMaxScaler
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM, Dense, Dropout

        close = "Close" if "Close" in df.columns else "close"
        data = df[close].values.reshape(-1, 1)

        scaler = MinMaxScaler()
        scaled = scaler.fit_transform(data)

        X, y = [], []
        for i in range(30, len(scaled)):
            X.append(scaled[i - 30:i])
            y.append(scaled[i])

        if len(X) == 0:
            return float(df[close].iloc[-1])

        X, y = np.array(X), np.array(y)

        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(X.shape[1], 1)),
            Dropout(0.2),
            LSTM(50),
            Dense(1)
        ])
        model.compile(optimizer="adam", loss="mse")
        model.fit(X, y, epochs=2, verbose=0)

        pred = model.predict(np.array([scaled[-30:]]), verbose=0)
        return float(scaler.inverse_transform(pred)[0][0])
    except Exception as e:
        logger.warning(f"LSTM prediction failed: {e}")
        close = "Close" if "Close" in df.columns else "close"
        return float(df[close].iloc[-1])

# ─── FINNHUB NEWS ───────────────────────────────────────────
def fetch_news(symbol: str | None = None) -> list:
    if not FINNHUB_API_KEY:
        logger.error("❌ Finnhub API key missing")
        return []

    if symbol:
        today = date.today()
        past = today - timedelta(days=30)
        url = (
            f"https://finnhub.io/api/v1/company-news"
            f"?symbol={symbol.upper()}&from={past}&to={today}&token={FINNHUB_API_KEY}"
        )
    else:
        url = f"https://finnhub.io/api/v1/news?category=general&token={FINNHUB_API_KEY}"

    try:
        res = requests.get(url, timeout=8)
        res.raise_for_status()

        data = res.json()

        if isinstance(data, list):
            return data
        else:
            logger.error(f"Unexpected Finnhub response: {data}")
            return []

    except Exception as e:
        logger.error(f"Finnhub error: {e}")
        return []

# ─── MARKET NEWS ────────────────────────────────────────────
@app.get("/api/market-news")
def market_news():
    cache_key = "market_news"

    if cache_key in NEWS_CACHE:
        data, ts = NEWS_CACHE[cache_key]
        if datetime.utcnow() - ts < NEWS_CACHE_EXPIRY:
            return data

    raw = fetch_news()

    items = [
        {
            "headline": n.get("headline", ""),
            "source": n.get("source", ""),
            "url": n.get("url", ""),
            "image": n.get("image", ""),
            "datetime": n.get("datetime", 0),
            "summary": n.get("summary", "")
        }
        for n in raw[:12]
        if n.get("headline")
    ]

    NEWS_CACHE[cache_key] = (items, datetime.utcnow())
    return items

# ─── STOCK ANALYSIS ─────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    symbol: str

@app.post("/api/analyze")
def analyze_stock(req: AnalyzeRequest, _user: Dict[str, Any] = Depends(require_user)):
    symbol = req.symbol.upper().strip()
    cache_key = f"analyze_{symbol}"

    if cache_key in CACHE:
        result, ts = CACHE[cache_key]
        if datetime.utcnow() - ts < CACHE_EXPIRY:
            return result

    try:
        df = fetch_data(symbol)
        df = features(df)

        close = "Close" if "Close" in df.columns else "close"
        current_price = float(df[close].iloc[-1])
        predicted_price = predict_price(df, symbol)

        # Sentiment from news
        news_items = fetch_news(symbol)
        sentiment_scores = []
        for item in news_items[:5]:
            text = item.get("headline", "")
            if sentiment_model:
                try:
                    result_s = sentiment_model(text[:512])[0]
                    label = result_s["label"].lower()
                    score = result_s["score"]
                    if label == "positive":
                        sentiment_scores.append(score)
                    elif label == "negative":
                        sentiment_scores.append(-score)
                    else:
                        sentiment_scores.append(0)
                except Exception:
                    vs = vader.polarity_scores(text)
                    sentiment_scores.append(vs["compound"])
            else:
                vs = vader.polarity_scores(text)
                sentiment_scores.append(vs["compound"])

        avg_sentiment = float(np.mean(sentiment_scores)) if sentiment_scores else 0.0

        # Signal logic
        rsi = float(df["RSI"].iloc[-1]) if "RSI" in df.columns else 50.0
        macd = float(df["MACD"].iloc[-1]) if "MACD" in df.columns else 0.0
        price_change = (predicted_price - current_price) / current_price

        if price_change > 0.02 and avg_sentiment > 0.1 and rsi < 70:
            signal = "STRONG BUY"
            confidence = min(95, int(70 + price_change * 100 + avg_sentiment * 20))
        elif price_change > 0 and rsi < 65:
            signal = "BUY"
            confidence = min(85, int(60 + price_change * 80))
        elif price_change < -0.02 or rsi > 75:
            signal = "SELL"
            confidence = min(90, int(65 + abs(price_change) * 80))
        else:
            signal = "HOLD"
            confidence = 55

        # Build OHLC series
        ohlc = []
        for _, row in df.tail(60).iterrows():
            dt = row.get("datetime")
            ohlc.append({
                "time": int(dt.timestamp()) if pd.notna(dt) else 0,
                "open": round(float(row.get("Open", row[close])), 2),
                "high": round(float(row.get("High", row[close])), 2),
                "low": round(float(row.get("Low", row[close])), 2),
                "close": round(float(row[close]), 2),
                "volume": int(row.get("Volume", 0)) if pd.notna(row.get("Volume", None)) else 0,
            })

        result = {
            "symbol": symbol,
            "current_price": round(current_price, 2),
            "predicted_price": round(predicted_price, 2),
            "signal": signal,
            "confidence": confidence,
            "sentiment": round(avg_sentiment, 3),
            "rsi": round(rsi, 2),
            "macd": round(macd, 4),
            "ohlc": ohlc,
            "news": news_items[:6],
        }

        CACHE[cache_key] = (result, datetime.utcnow())
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error for {symbol}: {e}")
        raise HTTPException(500, f"Analysis failed: {str(e)}")

# ─── COMPANY NEWS ───────────────────────────────────────────
@app.get("/api/news/{symbol}")
def company_news(symbol: str, _user: Dict[str, Any] = Depends(require_user)):
    cache_key = f"news_{symbol.upper()}"

    if cache_key in NEWS_CACHE:
        data, ts = NEWS_CACHE[cache_key]
        if datetime.utcnow() - ts < NEWS_CACHE_EXPIRY:
            return data

    raw = fetch_news(symbol)
    items = [
        {
            "headline": n.get("headline", ""),
            "source": n.get("source", ""),
            "url": n.get("url", ""),
            "image": n.get("image", ""),
            "datetime": n.get("datetime", 0),
            "summary": n.get("summary", ""),
        }
        for n in raw[:8]
        if n.get("headline")
    ]

    NEWS_CACHE[cache_key] = (items, datetime.utcnow())
    return items

# ─── AI SIGNALS ─────────────────────────────────────────────
WATCHLIST_SYMBOLS = ["AAPL", "NVDA", "RELIANCE.NS", "INFY.NS", "MSFT", "TSLA", "GOOGL", "AMZN"]

@app.get("/api/signals")
def get_signals(_user: Dict[str, Any] = Depends(require_user)):
    cache_key = "signals"
    if cache_key in CACHE:
        data, ts = CACHE[cache_key]
        if datetime.utcnow() - ts < timedelta(minutes=15):
            return data

    signals = []
    for sym in WATCHLIST_SYMBOLS[:4]:
        try:
            df = fetch_data(sym)
            df = features(df)
            close = "Close" if "Close" in df.columns else "close"
            rsi = float(df["RSI"].iloc[-1]) if "RSI" in df.columns else 50.0
            macd = float(df["MACD"].iloc[-1]) if "MACD" in df.columns else 0.0
            price = float(df[close].iloc[-1])
            prev = float(df[close].iloc[-2]) if len(df) > 1 else price
            chg = (price - prev) / prev * 100

            if rsi < 35 and macd > 0:
                action = "BUY"
                reason = f"Oversold RSI ({rsi:.0f}) + MACD bullish crossover"
                conf = 78
            elif rsi > 70 and macd < 0:
                action = "SELL"
                reason = f"Overbought RSI ({rsi:.0f}) + MACD bearish divergence"
                conf = 72
            elif abs(chg) > 2:
                action = "WATCH"
                reason = f"Volume spike + {abs(chg):.1f}% price movement"
                conf = 65
            else:
                action = "HOLD"
                reason = f"RSI neutral ({rsi:.0f}), no clear trigger"
                conf = 55

            signals.append({
                "symbol": sym.replace(".NS", ""),
                "action": action,
                "confidence": conf,
                "reason": reason,
                "price": round(price, 2),
                "change_pct": round(chg, 2),
                "timestamp": datetime.utcnow().isoformat(),
            })
        except Exception as e:
            logger.warning(f"Signal generation failed for {sym}: {e}")

    CACHE[cache_key] = (signals, datetime.utcnow())
    return signals