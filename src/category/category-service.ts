import CategoryModal from "./category-modal";
import { Category } from "./category-types";

export class CategoryService {
    async create(category: Category) {
        //TODO:IMplement
        const newCategory = new CategoryModal(category);
        return newCategory.save();
    }
    async getAll() {
        return await CategoryModal.find();
    }

    async getOne(categoryId: string) {
        return await CategoryModal.findOne({ _id: categoryId });
    }
}
