import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ownerRouter from "./owner";
import orderRouter from "./orders";
import productRouter from "./products";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ownerRouter);
router.use(productRouter);
router.use(orderRouter);
router.use(storageRouter);

export default router;
