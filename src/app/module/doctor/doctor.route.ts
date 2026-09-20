import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { multerUpload } from "../../config/multer.config";
import { DoctorController } from "./doctor.controller";
import { updateDoctorZodSchema } from "./doctor.validation";

const router = Router();

// Admin routes
router.get("/",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    DoctorController.getAllDoctors);

// Doctor self-profile routes (must come before /:id to avoid conflict)
router.get("/me",
    checkAuth(Role.DOCTOR),
    DoctorController.getMyProfile);
router.patch("/me",
    checkAuth(Role.DOCTOR),
    multerUpload.single("profilePhoto"),
    validateRequest(updateDoctorZodSchema),
    DoctorController.updateMyProfile);

router.get("/:id",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    DoctorController.getDoctorById);
router.patch("/:id",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    validateRequest(updateDoctorZodSchema), DoctorController.updateDoctor);
router.delete("/:id",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    DoctorController.deleteDoctor);

export const DoctorRoutes = router;
