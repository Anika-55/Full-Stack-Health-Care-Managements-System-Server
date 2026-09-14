import { Role } from "../../generated/prisma/enums";
import { envVars } from "../config/env";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

const DEFAULT_SPECIALTIES = [
    { title: "Cardiology", description: "Heart and cardiovascular system" },
    { title: "Dermatology", description: "Skin, hair, and nail conditions" },
    { title: "Endocrinology", description: "Hormone and metabolic disorders" },
    { title: "Gastroenterology", description: "Digestive system disorders" },
    { title: "General Practice", description: "Primary care and general medicine" },
    { title: "Neurology", description: "Nervous system disorders" },
    { title: "Obstetrics & Gynecology", description: "Women's reproductive health" },
    { title: "Oncology", description: "Cancer diagnosis and treatment" },
    { title: "Ophthalmology", description: "Eye and vision care" },
    { title: "Orthopedics", description: "Bones, joints, and musculoskeletal system" },
    { title: "Pediatrics", description: "Children's health and development" },
    { title: "Psychiatry", description: "Mental health disorders" },
    { title: "Pulmonology", description: "Respiratory system disorders" },
    { title: "Radiology", description: "Medical imaging and diagnosis" },
    { title: "Urology", description: "Urinary tract and reproductive system" },
];

export const seedSpecialties = async () => {
    try {
        const existingCount = await prisma.specialty.count();
        if (existingCount > 0) {
            console.log(`Specialties already exist (${existingCount}). Skipping seeding.`);
            return;
        }

        await prisma.specialty.createMany({
            data: DEFAULT_SPECIALTIES.map(s => ({
                title: s.title,
                description: s.description,
                isDeleted: false,
            })),
            skipDuplicates: true,
        });

        const count = await prisma.specialty.count();
        console.log(`${count} specialties seeded successfully`);
    } catch (error) {
        console.error("Error seeding specialties:", error);
    }
};

export const seedSuperAdmin = async () => {
    try {
        const isSuperAdminExist = await prisma.user.findFirst({
            where: {
                role: Role.SUPER_ADMIN
            }
        })

        if (isSuperAdminExist) {
            console.log("Super admin already exists. Skipping seeding super admin.");
            return;
        }

        const superAdminUser = await auth.api.signUpEmail({
            body: {
                email: envVars.SUPER_ADMIN_EMAIL,
                password: envVars.SUPER_ADMIN_PASSWORD,
                name: "Super Admin",
                role: Role.SUPER_ADMIN,
                needPasswordChange: false,
                rememberMe: false,
            }
        })

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: {
                    id: superAdminUser.user.id
                },
                data: {
                    emailVerified: true,
                }
            });

            await tx.admin.create({
                data: {
                    userId: superAdminUser.user.id,
                    name: "Super Admin",
                    email: envVars.SUPER_ADMIN_EMAIL,
                }
            })
        });

        const superAdmin = await prisma.admin.findFirst({
            where: {
                email: envVars.SUPER_ADMIN_EMAIL,
            },
            include: {
                user: true,
            }
        })

        console.log("Super Admin Created ", superAdmin);
    } catch (error) {
        console.error("Error seeding super admin: ", error);
        await prisma.user.delete({
            where: {
                email: envVars.SUPER_ADMIN_EMAIL,
            }
        })
    }
};