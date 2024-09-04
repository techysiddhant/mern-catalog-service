import { paginationLabels } from "../config/pagination";
import toppingModel from "./topping-model";
import { PaginateQuery, Topping } from "./topping-types";

export class ToppingService {
    async create(topping: Topping) {
        return await toppingModel.create(topping);
    }

    async getAll(tenantId: string, paginateQuery: PaginateQuery) {
        // todo: !Important, add pagination
        // return await toppingModel.find({ tenantId });
        const matchQuery = {
            tenantId: tenantId,
        };
        const aggregate = toppingModel.aggregate([
            {
                $match: matchQuery,
            },
        ]);
        return toppingModel.aggregatePaginate(aggregate, {
            ...paginateQuery,
            customLabels: paginationLabels,
        });
    }
    async getTopping(toppingId: string): Promise<Topping | null> {
        return await toppingModel.findOne({ _id: toppingId });
    }
    async updateTopping(toppingId: string, topping: Topping) {
        return toppingModel.findOneAndUpdate(
            {
                _id: toppingId,
            },
            {
                $set: topping,
            },
            {
                new: true,
            },
        );
    }
}
