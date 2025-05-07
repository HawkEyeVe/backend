import express from "express";
import geoRoute from "./routes/geo.js"; // Ensure the correct import statement
import cors from "cors";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/geo/", geoRoute); // Use the geo.js router under the correct path

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Hello World!",
  });
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
