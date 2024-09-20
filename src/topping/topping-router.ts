import express from "express";
import authenticate from "../common/middlewares/authenticate";
import { canAccess } from "../common/middlewares/canAccess";
import { Roles } from "../common/constants";
import fileUpload from "express-fileupload";
import createHttpError from "http-errors";
import createToppingValidator from "./create-topping-validator";
import { asyncWrapper } from "../common/utils/wrapper";
import { ToppingController } from "./topping-controller";
import { S3Storage } from "../common/services/S3Storage";
import { ToppingService } from "./topping-service";
import updateToppingValidator from "./update-topping-validator";
import { createMessageProducerBroker } from "../common/factories/brokerFactory";

const router = express.Router();
const toppingService = new ToppingService();
const broker = createMessageProducerBroker();

const toppingController = new ToppingController(
    new S3Storage(),
    toppingService,
    broker,
);
router.post(
    "/",
    authenticate,
    canAccess([Roles.ADMIN, Roles.MANAGER]),
    fileUpload({
        limits: { fileSize: 500 * 1024 }, // 500kb
        abortOnLimit: true,
        limitHandler: (req, res, next) => {
            const error = createHttpError(400, "File size exceeds the limit");
            next(error);
        },
    }),
    createToppingValidator,
    asyncWrapper(toppingController.create.bind(toppingController)),
);
router.get("/", asyncWrapper(toppingController.index.bind(toppingController)));
router.get(
    "/:toppingId",
    asyncWrapper(toppingController.get.bind(toppingController)),
);
router.put(
    "/:toppingId",
    authenticate,
    canAccess([Roles.ADMIN, Roles.MANAGER]),
    fileUpload({
        limits: { fileSize: 500 * 1024 }, // 500kb
        abortOnLimit: true,
        limitHandler: (req, res, next) => {
            const error = createHttpError(400, "File size exceeds the limit");
            next(error);
        },
    }),
    updateToppingValidator,
    asyncWrapper(toppingController.update.bind(toppingController)),
);
export default router;
