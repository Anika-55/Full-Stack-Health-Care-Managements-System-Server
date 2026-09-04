import z from "zod";

export const doctorRegistrationZodSchema = z.object({
    name: z
        .string("Name must be a string")
        .min(5, "Name must be at least 5 characters")
        .max(50, "Name must be at most 50 characters"),

    email: z
        .email("Please provide a valid email address"),

    password: z
        .string("Password must be a string")
        .min(8, "Password must be at least 8 characters")
        .max(100, "Password must be at most 100 characters"),

    registrationNumber: z
        .string("Registration number must be a string")
        .min(2, "Registration number is required"),

    qualification: z
        .string("Qualification must be a string")
        .min(2, "Qualification is required")
        .max(100, "Qualification must be at most 100 characters"),

    contactNumber: z
        .string("Contact number must be a string")
        .min(11, "Contact number must be at least 11 characters")
        .max(14, "Contact number must be at most 14 characters"),

    specialtyId: z
        .uuid("Specialty ID must be a valid UUID"),
});