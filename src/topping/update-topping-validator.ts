import { body } from "express-validator";

export default [
    body("name")
        .exists()
        .withMessage("Topping name is required")
        .isString()
        .withMessage("Topping name should be a string"),
    body("price").exists().withMessage("Price is required"),
    body("tenantId").exists().withMessage("Tenant Id is required"),
];
