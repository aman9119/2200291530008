import React, { useEffect, useState } from "react";
import { Container, Typography, Box, MenuItem, Select, FormControl, InputLabel, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

const API_BASE = "http://localhost:8000";
const intervals = [5, 15, 30, 60];

const Cell = styled('div')(({ theme, value }: { theme?: any, value: number }) => ({
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(90deg, #f44336 ${Math.max(0, (1-value)/2)*100}%, #fff 50%, #2196f3 ${Math.max(0, (1+value)/2)*100}%)`,
  color: Math.abs(value) > 0.7 ? '#fff' : '#222',
  fontWeight: 500,
  border: '1px solid #eee',
  cursor: 'pointer',
}));

const CorrelationHeatmap: React.FC = () => {
  const [minutes, setMinutes] = useState(15);
  const [stocks, setStocks] = useState<{[k:string]:string}>({});
  const [matrix, setMatrix] = useState<number[][]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [stats, setStats] = useState<{[k:string]:{avg:number,std:number}}>({});

  useEffect(() => {
    fetch(`${API_BASE}/stocks`).then(r => r.json()).then(d => {
      const codes = Object.values(d.stocks || {}) as string[];
      setLabels(codes);
      setStocks(d.stocks || {});
    });
  }, []);

  useEffect(() => {
    if (!labels.length) return;
    const fetchStats = async () => {
      const s: {[k:string]:{avg:number,std:number}} = {};
      for (let code of labels) {
        const d = await fetch(`${API_BASE}/stocks/${code}?minutes=${minutes}&aggregation=average`).then(r => r.json());
        s[code] = { avg: d.averageStockPrice, std: Math.sqrt((d.priceHistory.reduce((acc: number, p: any) => acc + Math.pow(p.price - d.averageStockPrice, 2), 0)) / d.priceHistory.length) };
      }
      setStats(s);
    };
    fetchStats();
  }, [labels, minutes]);

  useEffect(() => {
    if (!labels.length) return;
    const fetchMatrix = async () => {
      const m: number[][] = [];
      for (let i = 0; i < labels.length; i++) {
        m[i] = [];
        for (let j = 0; j < labels.length; j++) {
          if (i === j) m[i][j] = 1;
          else if (i < j) {
            const d = await fetch(`${API_BASE}/stockcorrelation?minutes=${minutes}&ticker=${labels[i]}&ticker=${labels[j]}`).then(r => r.json());
            m[i][j] = d.correlation;
          } else {
            m[i][j] = m[j][i];
          }
        }
      }
      setMatrix(m);
    };
    fetchMatrix();
  }, [labels, minutes]);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Correlation Heatmap</Typography>
      <Box sx={{ mb: 2 }}>
        <FormControl>
          <InputLabel id="minutes-label">Minutes</InputLabel>
          <Select labelId="minutes-label" value={minutes} label="Minutes" onChange={(e: any) => setMinutes(Number(e.target.value))}>
            {intervals.map(m => (
              <MenuItem value={m} key={m}>{m}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <Box sx={{ display: 'flex' }}>
          <Box sx={{ width: 100 }} />
          {labels.map(l => (
            <Tooltip key={l} title={`Avg: ${stats[l]?.avg?.toFixed(2) || '-'}\nStd: ${stats[l]?.std?.toFixed(2) || '-'}`} placement="top">
              <Box sx={{ width: 40, textAlign: 'center', fontWeight: 600 }}>{l}</Box>
            </Tooltip>
          ))}
        </Box>
        {labels.map((l, i) => (
          <Box key={l} sx={{ display: 'flex' }}>
            <Tooltip title={`Avg: ${stats[l]?.avg?.toFixed(2) || '-'}\nStd: ${stats[l]?.std?.toFixed(2) || '-'}`} placement="left">
              <Box sx={{ width: 100, textAlign: 'right', fontWeight: 600 }}>{l}</Box>
            </Tooltip>
            {labels.map((l2, j) => (
              <Tooltip key={l2} title={`Corr: ${matrix[i]?.[j]?.toFixed(2) || '-'}\n${l} Avg: ${stats[l]?.avg?.toFixed(2) || '-'}\n${l2} Avg: ${stats[l2]?.avg?.toFixed(2) || '-'}`} placement="top">
                <Cell value={matrix[i]?.[j] || 0}>{matrix[i]?.[j]?.toFixed(2) || '-'}</Cell>
              </Tooltip>
            ))}
          </Box>
        ))}
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2">Color Legend: <span style={{color:'#f44336'}}>Red</span> = Strong Negative, <span style={{color:'#2196f3'}}>Blue</span> = Strong Positive, White = Neutral</Typography>
      </Box>
    </Container>
  );
};

export default CorrelationHeatmap;
