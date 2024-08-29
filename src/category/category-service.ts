import CategoryModal from "./category-modal";
import { Category } from "./category-types";

export class CategoryService {
    async create(category: Category) {
        //TODO:IMplement
        const newCategory = new CategoryModal(category);
        return newCategory.save();
    }
}
