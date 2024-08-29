import express, { RequestHandler } from "express";
import { CategoryController } from "./category-controller";
import categoryValidator from "./category-validator";
const router = express.Router();
const categoryController = new CategoryController();
router.post("/", categoryValidator, (async (req, res) => {
    await categoryController.create(req, res);
}) as RequestHandler);

export default router;
