import productModel from "./product-model";
import { Filters, Product } from "./product-types";

export class ProductService {
    async createProduct(product: Product) {
        return await productModel.create(product);
    }
    async updateProduct(productId: string, product: Product) {
        return await productModel.findOneAndUpdate(
            {
                _id: productId,
            },
            {
                $set: product,
            },
            {
                new: true,
            },
        );
    }
    async getProduct(productId: string): Promise<Product | null> {
        return await productModel.findOne({ _id: productId });
    }
    async getProducts(q: string, filters: Filters) {
        const searchQueryRegexp = new RegExp(q, "i");
        const matchQuery = {
            ...filters,
            name: searchQueryRegexp,
        };
        const aggregate = productModel.aggregate([
            {
                $match: matchQuery,
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "categoryId",
                    foreignField: "_id",
                    as: "category",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                priceConfiguration: 1,
                                attributes: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: "$category",
            },
        ]);
        const result = await aggregate.exec();
        return result as Product[];
    }
}
