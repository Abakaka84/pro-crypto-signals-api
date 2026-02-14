const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/*
  Root Route
*/
app.get("/", (req, res) => {
  res.json({
    status: "API is running",
    endpoints: {
      price: "/price?coin=BTC",
      signal: "/signal?coin=BTC"
    }
  });
});

/*
  Price Endpoint
*/
app.get("/price", (req, res) => {
  try {
    const { coin } = req.query;

    if (!coin) {
      return res.status(400).json({ error: "Coin is required" });
    }

    const upperCoin = coin.toUpperCase();

    // سعر وهمي للتجربة
    const price = Math.floor(Math.random() * 50000) + 10000;

    res.json({
      coin: upperCoin,
      price: price
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Price fetch failed" });
  }
});

/*
  Signal Endpoint
*/
app.get("/signal", (req, res) => {
  try {
    const { coin } = req.query;

    if (!coin) {
      return res.status(400).json({ error: "Coin is required" });
    }

    const upperCoin = coin.toUpperCase();

    const price = Math.floor(Math.random() * 50000) + 10000;

    let signal = "HOLD";

    if (price < 20000) {
      signal = "BUY";
    } else if (price > 40000) {
      signal = "SELL";
    }

    res.json({
      coin: upperCoin,
      price: price,
      signal: signal
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Signal generation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
