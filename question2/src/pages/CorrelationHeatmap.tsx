import React from "react";
import { Container, Typography } from "@mui/material";

const CorrelationHeatmap: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Correlation Heatmap
      </Typography>
      {/* Heatmap will go here */}
    </Container>
  );
};

export default CorrelationHeatmap;
