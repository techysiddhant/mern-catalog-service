import { NextFunction, Request, Response } from "express";
import { FileStorage } from "../common/types/storage";
import { ToppingService } from "./topping-service";
import { CreateRequestBody, Topping } from "./topping-types";
import { UploadedFile } from "express-fileupload";
import { v4 as uuidv4 } from "uuid";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import { AuthRequest } from "../common/types";
import { Roles } from "../common/constants";

export class ToppingController {
    constructor(
        private storage: FileStorage,
        private toppingService: ToppingService,
    ) {}
    async create(
        req: Request<object, object, CreateRequestBody>,
        res: Response,
        next: NextFunction,
    ) {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(createHttpError(400, result.array()[0].msg as string));
        }
        const image = req.files!.image as UploadedFile;
        const fileUuid = uuidv4();
        await this.storage.upload({
            filename: fileUuid,
            fileData: image.data.buffer,
        });
        // todo: add error handling
        const savedTopping = await this.toppingService.create({
            ...req.body,
            image: fileUuid,
            tenantId: req.body.tenantId,
        } as Topping);
        // todo: add logging
        // Send topping to kafka.
        // todo: move topic name to the config

        res.json({ id: savedTopping._id });
    }
    async index(req: Request, res: Response, next: NextFunction) {
        if (!req.query.tenantId) {
            return next(createHttpError(404, "Add Tenant Id"));
        }
        const toppings = await this.toppingService.getAll(
            req.query.tenantId as string,
            {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit
                    ? parseInt(req.query.limit as string)
                    : 3,
            },
        );
        // todo: add error handling
        const readyToppings = (toppings.data as Topping[]).map((topping) => {
            return {
                id: topping._id,
                name: topping.name,
                price: topping.price,
                tenantId: topping.tenantId,
                image: this.storage.getObjectUri(topping.image),
            };
        });
        res.json({
            data: readyToppings,
            total: toppings.total,
            pageSize: toppings.limit,
            currentPage: toppings.page,
        });
    }
    async get(req: Request, res: Response, next: NextFunction) {
        const { toppingId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(toppingId)) {
            return next(createHttpError(404, "Invalid Topping ID"));
        }
        const topping = await this.toppingService.getTopping(toppingId);
        if (!topping) {
            return next(createHttpError(404, "Tooping not found"));
        }
        topping.image = this.storage.getObjectUri(topping.image);
        res.json(topping);
    }
    async update(req: Request, res: Response, next: NextFunction) {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(createHttpError(400, result.array()[0].msg as string));
        }
        const { toppingId } = req.params;
        const topping = await this.toppingService.getTopping(toppingId);
        if (!topping) {
            return next(createHttpError(404, "Topping not found"));
        }
        if ((req as AuthRequest).auth.role !== Roles.ADMIN) {
            const tenant = (req as AuthRequest).auth.tenant;
            if (topping.tenantId !== tenant) {
                return next(
                    createHttpError(
                        403,
                        "You are not allowed to access this topping",
                    ),
                );
            }
        }

        let imageName: string | undefined;
        let oldImage: string | undefined;
        if (req.files?.image) {
            oldImage = topping.image;

            const image = req.files.image as UploadedFile;
            imageName = uuidv4();

            await this.storage.upload({
                filename: imageName,
                fileData: image.data.buffer,
            });

            await this.storage.delete(oldImage);
        }
        const { name, price, tenantId } = req.body as Topping;
        const toppingToUpdate = {
            name,
            price,
            tenantId,
            image: imageName ? imageName : (oldImage as string),
        } as Topping;
        const updateTopping = await this.toppingService.updateTopping(
            toppingId,
            toppingToUpdate,
        );
        res.json({ id: updateTopping?._id });
    }
}
