/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import { ProductService } from "./product-service";
import { Filters, Product } from "./product-types";
import { FileStorage } from "../common/types/storage";
import { v4 as uuidv4 } from "uuid";
import { UploadedFile } from "express-fileupload";
import { AuthRequest } from "../common/types";
import { Roles } from "../common/constants";
import mongoose from "mongoose";
import { MessageProducerBroker } from "../common/types/broker";
import config from "config";
import { mapToObject } from "../utils";
export class ProductController {
    constructor(
        private productService: ProductService,
        private storage: FileStorage,
        private broker: MessageProducerBroker,
    ) {}
    async create(req: Request, res: Response, next: NextFunction) {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(createHttpError(400, result.array()[0].msg as string));
        }
        const image = req.files!.image as UploadedFile;
        const imageName = uuidv4();
        await this.storage.upload({
            filename: imageName,
            fileData: image.data.buffer,
        });
        const {
            name,
            description,
            priceConfiguration,
            attributes,
            tenantId,
            categoryId,
            isPublish,
        } = req.body as Product;
        const product = {
            name,
            description,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            priceConfiguration: JSON.parse(priceConfiguration),
            attributes: JSON.parse(attributes as unknown as string),
            tenantId,
            categoryId,
            isPublish,
            image: imageName,
        };
        const newProduct = await this.productService.createProduct(product);
        await this.broker.sendMessage(
            config.get("kafka.topic"),
            JSON.stringify({
                id: newProduct._id,
                priceConfiguration: mapToObject(
                    newProduct.priceConfiguration as unknown as Map<
                        string,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        any
                    >,
                ),
            }),
        );
        res.json({ id: newProduct._id });
    }
    async update(req: Request, res: Response, next: NextFunction) {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(createHttpError(400, result.array()[0].msg as string));
        }
        const { productId } = req.params;
        const productDB = await this.productService.getProduct(productId);
        if (!productDB) {
            return next(createHttpError(404, "Product not found"));
        }
        if ((req as AuthRequest).auth.role !== Roles.ADMIN) {
            const tenant = (req as AuthRequest).auth.tenant;
            if (productDB.tenantId !== String(tenant)) {
                return next(
                    createHttpError(
                        403,
                        "You are not allowed to access this product",
                    ),
                );
            }
        }
        let imageName: string | undefined;
        let oldImage: string | undefined;
        if (req.files?.image) {
            oldImage = productDB.image;
            const image = req.files.image as UploadedFile;
            imageName = uuidv4();
            await this.storage.upload({
                filename: imageName,
                fileData: image.data.buffer,
            });
            await this.storage.delete(oldImage);
        }
        const {
            name,
            description,
            priceConfiguration,
            attributes,
            tenantId,
            categoryId,
            isPublish,
        } = req.body as Product;
        const product = {
            name,
            description,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            priceConfiguration: JSON.parse(priceConfiguration),
            attributes: JSON.parse(attributes as unknown as string),
            tenantId,
            categoryId,
            isPublish,
            image: imageName ? imageName : (oldImage as string),
        };
        const updatedProduct = await this.productService.updateProduct(
            productId,
            product,
        );
        await this.broker.sendMessage(
            config.get("kafka.topic"),
            JSON.stringify({
                id: updatedProduct._id,
                priceConfiguration: mapToObject(
                    updatedProduct.priceConfiguration as unknown as Map<
                        string,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        any
                    >,
                ),
            }),
        );
        res.json({
            id: productId,
        });
    }
    async index(req: Request, res: Response) {
        const { q, tenantId, categoryId, isPublish } = req.query;
        const filters: Filters = {};
        if (isPublish === "true") {
            filters.isPublish = true;
        }
        if (tenantId) {
            filters.tenantId = tenantId as string;
        }
        if (
            categoryId &&
            mongoose.Types.ObjectId.isValid(categoryId as string)
        ) {
            filters.categoryId = new mongoose.Types.ObjectId(
                categoryId as string,
            );
        }
        //TODO:add logging
        const products = await this.productService.getProducts(
            q as string,
            filters,
            {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit
                    ? parseInt(req.query.limit as string)
                    : 10,
            },
        );

        const finalProducts = (products.data as Product[]).map(
            (product: Product) => {
                return {
                    ...product,
                    image: this.storage.getObjectUri(product.image),
                };
            },
        );
        res.json({
            data: finalProducts,
            total: products.total,
            pageSize: products.limit,
            currentPage: products.page,
        });
    }
    async get(req: Request, res: Response, next: NextFunction) {
        const { productId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return next(createHttpError(404, "Invalid Product ID"));
        }
        const product = await this.productService.getPublicProduct(productId);
        if (!product) {
            return next(createHttpError(404, "Product not found"));
        }
        product.image = this.storage.getObjectUri(product.image);
        res.json(product);
    }
}
