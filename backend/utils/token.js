import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const TOKEN_TTL = process.env.JWT_EXPIRES_IN || "8h";
const ISSUER = "bloodtrack";

const getSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        // Fail closed: never fall back to a default signing key.
        throw new Error(
            "JWT_SECRET is missing or too short (min 32 chars). Set it in backend/.env."
        );
    }
    return secret;
};

// Called once at startup so a misconfigured server refuses to boot.
export const assertTokenConfig = () => {
    getSecret();
};

export const signToken = (user) =>
    jwt.sign({ role: user.role, email: user.email }, getSecret(), {
        algorithm: "HS256",
        expiresIn: TOKEN_TTL,
        issuer: ISSUER,
        subject: String(user.user_id ?? user.id),
    });

export const verifyToken = (token) =>
    jwt.verify(token, getSecret(), { algorithms: ["HS256"], issuer: ISSUER });
