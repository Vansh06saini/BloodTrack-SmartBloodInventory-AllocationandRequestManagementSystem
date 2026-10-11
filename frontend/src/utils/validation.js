// Client-side checks. They mirror backend/utils/authValidation.js so users get
// instant feedback; the server remains the source of truth.

export const PASSWORD_MIN_LENGTH = 8;

export function validateName(name) {
    const value = name.trim();
    if (value.length < 2 || value.length > 100 || !/\p{L}/u.test(value)) {
        return "Please enter a valid hospital or full name (2-100 characters).";
    }
    return "";
}

export function validateEmail(email) {
    const value = email.trim();
    if (!value) return "Please enter your email address.";
    if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        return "Please enter a valid email address.";
    }
    return "";
}

export function validateContact(contact) {
    if (!contact.trim()) return "Please enter your contact number.";
    if (!/^\+?\d{7,15}$/.test(contact.trim().replace(/[\s\-().]/g, ""))) {
        return "Please enter a valid contact number (7-15 digits).";
    }
    return "";
}

export function validateNewPassword(password) {
    if (!password) return "Please enter your password.";
    if (password.length < PASSWORD_MIN_LENGTH) {
        return `Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (new TextEncoder().encode(password).length > 72) {
        return "Password must be at most 72 bytes long.";
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return "Password must include at least one letter and one number.";
    }
    return "";
}
