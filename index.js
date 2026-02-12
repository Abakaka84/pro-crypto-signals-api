const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.json({
    status: "Pro Crypto Signals API Running",
    endpoints: {
      price: "/price?symbol=BTCUSDT",
      signal: "/signal?symbol=BTCUSDT"
    }
  });
});

// ===============================
// جلب بيانات الشموع لحساب RSI
// ===============================
async function getKlines(symbol) {
  const response = await axios.get(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=50`
  );
  return response.data;
}

// ===============================
// حساب RSI
// ===============================
function calculateRSI(closes, period = 14) {
  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length - 1; i++) {
    const diff = closes[i + 1] - closes[i];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// ===============================
// السعر المباشر
// ===============================
app.get("/price", async (req, res) => {
  try {
    const symbol = req.query.symbol || "BTCUSDT";

    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
    );

    res.json({
      symbol: symbol,
      price: parseFloat(response.data.price)
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch price" });
  }
});

// ===============================
// إشارة احترافية
// ===============================
app.get("/signal", async (req, res) => {
  try {
    const symbol = req.query.symbol || "BTCUSDT";

    const klines = await getKlines(symbol);

    const closes = klines.map(k => parseFloat(k[4]));

    const rsi = calculateRSI(closes);

    const lastPrice = closes[closes.length - 1];

    const ma =
      closes.slice(-20).reduce((a, b) => a + b, 0) / 20;

    let signal = "HOLD";

    if (rsi < 30 && lastPrice > ma) signal = "BUY";
    else if (rsi > 70 && lastPrice < ma) signal = "SELL";

    res.json({
      symbol: symbol,
      price: lastPrice,
      RSI: rsi.toFixed(2),
      movingAverage: ma.toFixed(2),
      signal: signal
    });

  } catch (error) {
    res.status(500).json({ error: "Signal generation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
