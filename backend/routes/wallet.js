import express from "express";
import { auth } from "../middleware/auth.js";

import { getWalletHistory } from "../controllers/walletController.js";

const router = express.Router();

router.get("/history", auth, getWalletHistory);

export default router;
