// Server/src/app.ts - Fixed middleware order
/* eslint-disable @typescript-eslint/no-explicit-any */
import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import cron from "node-cron";
import path from "path";
import qs from "qs";
import { envVars } from "./app/config/env";
import { auth } from "./app/lib/auth";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AppointmentService } from "./app/module/appointment/appointment.service";
import { PaymentController } from "./app/module/payment/payment.controller";
import { IndexRoutes } from "./app/routes";

const app: Application = express();
app.set("query parser", (str : string) => qs.parse(str));

app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), `src/app/templates`))

app.post("/webhook", express.raw({ type: "application/json" }), PaymentController.handleStripeWebhookEvent)

// CORS first
app.use(cors({
    origin: [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL, "http://localhost:8080", "http://localhost:5000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))

// Body parsers and cookie parser BEFORE auth handlers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())

// Better Auth handler
app.use("/api/auth", toNodeHandler(auth))

// Custom API routes
app.use("/api/v1", IndexRoutes);

// Basic route
app.get('/', async (req: Request, res: Response) => {
    res.status(201).json({
        success: true,
        message: 'API is working',
    });
});

cron.schedule("*/25 * * * *", async () => {
    try {
        console.log("Running cron job to cancel unpaid appointments...");
        await AppointmentService.cancelUnpaidAppointments();
    } catch (error: any) {
        console.error("Error occurred while canceling unpaid appointments:", error.message);    
    }
})

app.use(globalErrorHandler)
app.use(notFound)

export default app;