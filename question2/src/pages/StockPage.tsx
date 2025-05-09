import React, { useEffect, useState } from "react";
import { Container, Typography, Box, MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

const API_BASE = "http://localhost:8000";
const intervals = [5, 15, 30, 60];

const StockPage: React.FC = () => {
  const [ticker, setTicker] = useState("AAPL");
  const [minutes, setMinutes] = useState(15);
  const [data, setData] = useState<any>(null);
  const [stocks, setStocks] = useState<{[k:string]:string}>({});

  useEffect(() => {
    fetch(`${API_BASE}/stocks/${ticker}?minutes=${minutes}&aggregation=average`)
      .then(r => r.json())
      .then(setData);
  }, [ticker, minutes]);

  useEffect(() => {
    fetch(`${API_BASE}/stocks`)
      .then(r => r.json())
      .then(d => setStocks(d.stocks || {}));
  }, []);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Stock Price Analytics</Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <FormControl>
          <InputLabel id="ticker-label">Ticker</InputLabel>
          <Select labelId="ticker-label" value={ticker} label="Ticker" onChange={(e: any) => setTicker(e.target.value as string)}>
            {Object.entries(stocks).map(([name, code]) => (
              <MenuItem value={code} key={code}>{name} ({code})</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <InputLabel id="minutes-label">Minutes</InputLabel>
          <Select labelId="minutes-label" value={minutes} label="Minutes" onChange={(e: any) => setMinutes(Number(e.target.value))}>
            {intervals.map(m => (
              <MenuItem value={m} key={m}>{m}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {data && data.priceHistory && (
        <LineChart width={700} height={350} data={data.priceHistory} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="lastUpdatedAt" tick={false} />
          <YAxis />
          <Tooltip formatter={(v: any) => v.toFixed(2)} labelFormatter={l => l} />
          <Line type="monotone" dataKey="price" stroke="#1976d2" dot />
          <ReferenceLine y={data.averageStockPrice} label="Avg" stroke="red" strokeDasharray="3 3" />
        </LineChart>
      )}
    </Container>
  );
};

export default StockPage;
