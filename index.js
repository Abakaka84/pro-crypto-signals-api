const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ================================
// الصفحة الرئيسية
// ================================
app.get("/", (req, res) => {
  res.json({
    status: "Pro Crypto Signals API Running",
    endpoints: {
      price: "/price?symbol=bitcoin",
      signal: "/signal?symbol=bitcoin"
    }
  });
});

// ================================
// جلب بيانات تاريخية لحساب RSI
// ================================
async function getHistoricalPrices(coin) {
  const response = await axios.get(
    `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=2`
  );

  return response.data.prices.map(p => p[1]);
}

// ================================
// حساب RSI
// ================================
function calculateRSI(prices, period = 14) {
  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length - 1; i++) {
    const diff = prices[i + 1] - prices[i];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// ================================
// PRICE ENDPOINT
// ================================
app.get("/price", async (req, res) => {
  try {
    const symbol = req.query.symbol || "bitcoin";

    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`
    );

    if (!response.data[symbol]) {
      return res.status(400).json({
        error: "Invalid coin ID. Example: bitcoin, ethereum, ripple"
      });
    }

    res.json({
      coin: symbol,
      price_usd: response.data[symbol].usd
    });

  } catch (error) {
    console.error("PRICE ERROR:", error.message);
    res.status(500).json({
      error: "Failed to fetch price",
      details: error.message
    });
  }
});

// ================================
// SIGNAL ENDPOINT
// ================================
app.get("/signal", async (req, res) => {
  try {
    const symbol = req.query.symbol || "bitcoin";

    const prices = await getHistoricalPrices(symbol);

    if (!prices || prices.length < 20) {
      return res.status(400).json({
        error: "Not enough data for signal"
      });
    }

    const rsi = calculateRSI(prices);
    const lastPrice = prices[prices.length - 1];

    const ma =
      prices.slice(-20).reduce((a, b) => a + b, 0) / 20;

    let signal = "HOLD";

    if (rsi < 30 && lastPrice > ma) signal = "BUY";
    else if (rsi > 70 && lastPrice < ma) signal = "SELL";

    res.json({
      coin: symbol,
      price_usd: lastPrice,
      RSI: rsi.toFixed(2),
      movingAverage: ma.toFixed(2),
      signal: signal
    });

  } catch (error) {
    console.error("SIGNAL ERROR:", error.message);
    res.status(500).json({
      error: "Signal generation failed",
      details: error.message
    });
  }
});

// ================================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
