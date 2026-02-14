const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const SUPPORTED_COINS = ["BTC", "ETH", "BNB", "SOL", "XRP"];

/* ===============================
   Utility Functions
=================================*/

// Get Candles
async function getCandles(symbol) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=1h&limit=100`;
  const response = await axios.get(url);
  return response.data.map(candle => parseFloat(candle[4]));
}

// Calculate EMA
function calculateEMA(prices, period = 20) {
  const k = 2 / (period + 1);
  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }

  return ema;
}

// Calculate RSI
function calculateRSI(prices, period = 14) {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/* ===============================
   Routes
=================================*/

app.get("/", (req, res) => {
  res.json({
    status: "Pro Crypto Signals API v2 Running",
    supportedCoins: SUPPORTED_COINS,
    endpoints: {
      signal: "/signal?coin=BTC"
    }
  });
});

app.get("/signal", async (req, res) => {
  try {
    const { coin } = req.query;

    if (!coin) {
      return res.status(400).json({ error: "Coin is required" });
    }

    const symbol = coin.toUpperCase();

    if (!SUPPORTED_COINS.includes(symbol)) {
      return res.status(400).json({
        error: "Unsupported coin",
        supportedCoins: SUPPORTED_COINS
      });
    }

    const prices = await getCandles(symbol);

    const currentPrice = prices[prices.length - 1];
    const ema20 = calculateEMA(prices, 20);
    const rsi14 = calculateRSI(prices, 14);

    let signal = "HOLD";

    if (currentPrice > ema20 && rsi14 < 70) {
      signal = "BUY";
    } else if (currentPrice < ema20 && rsi14 > 30) {
      signal = "SELL";
    }

    const takeProfit =
      signal === "BUY"
        ? currentPrice * 1.02
        : signal === "SELL"
        ? currentPrice * 0.98
        : null;

    const stopLoss =
      signal === "BUY"
        ? currentPrice * 0.98
        : signal === "SELL"
        ? currentPrice * 1.02
        : null;

    res.json({
      coin: symbol,
      price: currentPrice,
      indicators: {
        ema20: ema20,
        rsi14: rsi14.toFixed(2)
      },
      signal: signal,
      riskManagement: {
        takeProfit: takeProfit,
        stopLoss: stopLoss
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Signal generation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
