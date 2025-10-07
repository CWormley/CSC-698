import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Server running ✅"));
app.listen(5000, () => console.log("Server on port 5000"));