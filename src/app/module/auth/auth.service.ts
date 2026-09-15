import status from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { UserStatus } from "../../../generated/prisma/enums";
import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { tokenUtils } from "../../utils/token";
import { IChangePasswordPayload, IDoctorRegistrationPayload, ILoginUserPayload, IRegisterPatientPayload } from "./auth.interface";


const registerPatient = async (payload: IRegisterPatientPayload) => {
    const { name, email, password } = payload;

    const data = await auth.api.signUpEmail({
        body: {
            name,
            email,
            password,
        }
    })

    if (!data.user) {
        throw new AppError(status.BAD_REQUEST, "Failed to register patient");
    }

    try {
        const patient = await prisma.$transaction(async (tx) => {
            const patientTx = await tx.patient.create({
                data: {
                    userId: data.user.id,
                    name: payload.name,
                    email: payload.email,
                }
            })
            return patientTx
        })

        const accessToken = tokenUtils.getAccessToken({
            userId: data.user.id,
            role: data.user.role,
            name: data.user.name,
            email: data.user.email,
            status: data.user.status,
            isDeleted: data.user.isDeleted,
            emailVerified: data.user.emailVerified,
        });

        const refreshToken = tokenUtils.getRefreshToken({
            userId: data.user.id,
            role: data.user.role,
            name: data.user.name,
            email: data.user.email,
            status: data.user.status,
            isDeleted: data.user.isDeleted,
            emailVerified: data.user.emailVerified,
        });

        return {
            ...data,
            accessToken,
            refreshToken,
            patient
        }

    } catch (error) {
        console.log("Transaction error : ", error);
        await prisma.user.delete({
            where: { id: data.user.id }
        })
        throw error;
    }
}


// registerDoctor function

const registerDoctor = async (payload: IDoctorRegistrationPayload) => {
    const { name, email, password, registrationNumber, qualification, contactNumber, specialtyId } = payload;

    console.log("=== Doctor Registration Debug ===");
    console.log("Payload:", JSON.stringify(payload, null, 2));

    // Verify specialty
    const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (!specialty) throw new AppError(status.NOT_FOUND, "Specialty not found");
    if (specialty.isDeleted) throw new AppError(status.NOT_FOUND, "Specialty is not available");

    // Step 1: Create user in Better Auth
    const data = await auth.api.signUpEmail({
        body: { name, email, password }
    });

    if (!data.user?.id) throw new AppError(status.BAD_REQUEST, "Failed to register doctor");

    console.log("Better Auth User:", data.user.id, data.user.role);

    // Step 2: Ensure User in Prisma
    const prismaUser = await prisma.user.upsert({
        where: { id: data.user.id },
        update: { role: "DOCTOR", emailVerified: data.user.emailVerified },
        create: {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: "DOCTOR",
            emailVerified: data.user.emailVerified,
            status: "ACTIVE",
            needPasswordChange: false,
            isDeleted: false,
        }
    });

    console.log("Prisma User:", prismaUser.id, prismaUser.role);

    // Step 3: Create Doctor with ALL required fields (database requires these)
    try {
        console.log("Attempting doctor creation...");
        const doctor = await prisma.doctor.create({
            data: {
                userId: data.user.id,
                name,
                email,
                registrationNumber,
                qualification,
                contactNumber: contactNumber || null,
                profilePhoto: null,
                address: null,
                isDeleted: false,
                experience: 0,
                gender: "OTHER",
                appointmentFee: 0,
                currentWorkingPlace: "",
                designation: "",
            }
        });
        console.log("Doctor created:", doctor.id);

        await prisma.doctorSpecialty.create({
            data: { doctorId: doctor.id, specialtyId }
        });

        const accessToken = tokenUtils.getAccessToken({
            userId: data.user.id,
            role: "DOCTOR",
            name: data.user.name,
            email: data.user.email,
            status: data.user.status,
            isDeleted: data.user.isDeleted,
            emailVerified: data.user.emailVerified,
        });

        const refreshToken = tokenUtils.getRefreshToken({
            userId: data.user.id,
            role: "DOCTOR",
            name: data.user.name,
            email: data.user.email,
            status: data.user.status,
            isDeleted: data.user.isDeleted,
            emailVerified: data.user.emailVerified,
        });

        return { ...data, accessToken, refreshToken, doctor };

    } catch (error) {
        console.error("========== DOCTOR REGISTRATION FAILED ==========");
        console.error("User ID:", data.user.id);
        console.error("Email:", data.user.email);
        console.error("Error:", error);
        console.error("=================================================");

        throw error;

    }
}
const loginUser = async (payload: ILoginUserPayload) => {
    const { email, password } = payload;

    const data = await auth.api.signInEmail({
        body: { email, password }
    })

    if (data.user.status === UserStatus.BLOCKED) {
        throw new AppError(status.FORBIDDEN, "User is blocked");
    }

    if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
        throw new AppError(status.NOT_FOUND, "User is deleted");
    }

    const accessToken = tokenUtils.getAccessToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        status: data.user.status,
        isDeleted: data.user.isDeleted,
        emailVerified: data.user.emailVerified,
    });

    const refreshToken = tokenUtils.getRefreshToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        status: data.user.status,
        isDeleted: data.user.isDeleted,
        emailVerified: data.user.emailVerified,
    });

    return { ...data, accessToken, refreshToken };
}

const getMe = async (user: IRequestUser) => {
    if (!user || !user.userId) {
        throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! User information is missing.');
    }

    const isUserExists = await prisma.user.findUnique({
        where: { id: user.userId },
        include: {
            patient: { include: { appointments: true, reviews: true, prescriptions: true, medicalReports: true, patientHealthData: true } },
            doctor: { include: { specialties: true, appointments: true, reviews: true, prescriptions: true } },
            admin: true,
        }
    })

    if (!isUserExists) {
        // User exists in Better Auth but not in Prisma - clean up the orphaned session
        // This happens when registration transaction failed after Better Auth user creation
        throw new AppError(status.NOT_FOUND, "User profile not found. Please re-register.");
    }

    return isUserExists;
}

const getNewToken = async (refreshToken : string, sessionToken : string) => {
    const isSessionTokenExists = await prisma.session.findUnique({
        where : { token : sessionToken },
        include : { user : true }
    })

    if(!isSessionTokenExists){
        throw new AppError(status.UNAUTHORIZED, "Invalid session token");
    }

    const verifiedRefreshToken = jwtUtils.verifyToken(refreshToken, envVars.REFRESH_TOKEN_SECRET)

    if(!verifiedRefreshToken.success && verifiedRefreshToken.error){
        throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
    }

    const data = verifiedRefreshToken.data as JwtPayload;

    const newAccessToken = tokenUtils.getAccessToken({
        userId: data.userId,
        role: data.role,
        name: data.name,
        email: data.email,
        status: data.status,
        isDeleted: data.isDeleted,
        emailVerified: data.emailVerified,
    });

    const newRefreshToken = tokenUtils.getRefreshToken({
        userId: data.userId,
        role: data.role,
        name: data.name,
        email: data.email,
        status: data.status,
        isDeleted: data.isDeleted,
        emailVerified: data.emailVerified,
    });

    const {token} = await prisma.session.update({
        where : { token : sessionToken },
        data : {
            token : sessionToken,
            expiresAt: new Date(Date.now() + 60 * 60 * 60 * 24 * 1000),
            updatedAt: new Date(),
        }
    })

    return { accessToken : newAccessToken, refreshToken : newRefreshToken, sessionToken : token };
}

const changePassword = async (payload : IChangePasswordPayload, sessionToken : string) =>{
    const session = await auth.api.getSession({
        headers : new Headers({ Authorization : `Bearer ${sessionToken}` })
    })

    if(!session){
        throw new AppError(status.UNAUTHORIZED, "Invalid session token");
    }

    const {currentPassword, newPassword} = payload;

    const result = await auth.api.changePassword({
        body :{ currentPassword, newPassword, revokeOtherSessions: true },
        headers : new Headers({ Authorization : `Bearer ${sessionToken}` })
    })

    if(session.user.needPasswordChange){
        await prisma.user.update({
            where: { id: session.user.id },
            data: { needPasswordChange: false }
        })
    }

    const accessToken = tokenUtils.getAccessToken({
        userId: session.user.id,
        role: session.user.role,
        name: session.user.name,
        email: session.user.email,
        status: session.user.status,
        isDeleted: session.user.isDeleted,
        emailVerified: session.user.emailVerified,
    });

    const refreshToken = tokenUtils.getRefreshToken({
        userId: session.user.id,
        role: session.user.role,
        name: session.user.name,
        email: session.user.email,
        status: session.user.status,
        isDeleted: session.user.isDeleted,
        emailVerified: session.user.emailVerified,
    });
    
    return { ...result, accessToken, refreshToken };
}

const logoutUser = async (sessionToken : string) => {
    const result = await auth.api.signOut({
        headers : new Headers({ Authorization : `Bearer ${sessionToken}` })
    })
    return result;
}

const verifyEmail = async (email : string, otp : string) => {
    const result = await auth.api.verifyEmailOTP({ body: { email, otp } })
    if(result.status && !result.user.emailVerified){
        await prisma.user.update({ where : { email }, data : { emailVerified: true } })
    }
}

const forgetPassword = async (email : string) => {
    const isUserExist = await prisma.user.findUnique({ where : { email } })
    if(!isUserExist) throw new AppError(status.NOT_FOUND, "User not found");
    if(!isUserExist.emailVerified) throw new AppError(status.BAD_REQUEST, "Email not verified");
    if(isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) throw new AppError(status.NOT_FOUND, "User not found"); 
    await auth.api.requestPasswordResetEmailOTP({ body: { email } })
}

const resetPassword = async (email : string, otp : string, newPassword : string) => {
    const isUserExist = await prisma.user.findUnique({ where: { email } })
    if (!isUserExist) throw new AppError(status.NOT_FOUND, "User not found");
    if (!isUserExist.emailVerified) throw new AppError(status.BAD_REQUEST, "Email not verified");
    if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) throw new AppError(status.NOT_FOUND, "User not found");
    await auth.api.resetPasswordEmailOTP({ body: { email, otp, password : newPassword } })
    if (isUserExist.needPasswordChange) {
        await prisma.user.update({ where: { id: isUserExist.id }, data: { needPasswordChange: false } })
    }
    await prisma.session.deleteMany({ where: { userId : isUserExist.id } })
}

const googleLoginSuccess = async (session : Record<string, any>) =>{
    const isPatientExists = await prisma.patient.findUnique({ where : { userId : session.user.id } })
    if(!isPatientExists){
        await prisma.patient.create({ data : { userId : session.user.id, name : session.user.name, email : session.user.email } })
    }
    const accessToken = tokenUtils.getAccessToken({ userId: session.user.id, role: session.user.role, name: session.user.name });
    const refreshToken = tokenUtils.getRefreshToken({ userId: session.user.id, role: session.user.role, name: session.user.name });
    return { accessToken, refreshToken };
}

export const AuthService = {
    registerPatient,
    registerDoctor,
    loginUser,
    getMe,
    getNewToken,
    changePassword,
    logoutUser,
    verifyEmail,
    forgetPassword,
    resetPassword,
    googleLoginSuccess,
};