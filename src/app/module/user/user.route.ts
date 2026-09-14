import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { createDoctorZodSchema } from "./user.validation";




const router = Router();


router.post("/create-doctor", validateRequest(createDoctorZodSchema), UserController.createDoctor);
router.post("/create-admin", UserController.createDoctor);
router.post("/create-superadmin", UserController.createDoctor);

export const UserRoutes = router;