// Validation + normalisation for account data.
// Used by registration (and therefore by the "create account from login" flow).

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72; // bcrypt only uses the first 72 bytes

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export const normalizeEmail = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

export const validatePassword = (password) => {
    if (typeof password !== "string" || password.length === 0) {
        return "Password is required.";
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
        return `Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) {
        return `Password must be at most ${PASSWORD_MAX_BYTES} bytes long.`;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return "Password must include at least one letter and one number.";
    }
    return "";
};

/**
 * Validates a registration payload.
 * Returns { values, fields } where `fields` maps field name -> message.
 * `values` only exists (and is only safe to use) when `fields` is empty.
 * Any `role` sent by the client is deliberately never read.
 */
export const validateRegistration = (body = {}) => {
    const fields = {};

    const name =
        typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    if (name.length < 2 || name.length > 100 || CONTROL_CHARS.test(name) || !/\p{L}/u.test(name)) {
        fields.name = "Please enter a valid hospital or full name (2-100 characters).";
    }

    const email = normalizeEmail(body.email);
    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
        fields.email = "Please enter a valid email address.";
    }

    // Accept common phone formatting, store digits with an optional leading +
    const contact =
        typeof body.contact === "string" ? body.contact.trim().replace(/[\s\-().]/g, "") : "";
    if (!/^\+?\d{7,15}$/.test(contact)) {
        fields.contact = "Please enter a valid contact number (7-15 digits).";
    }

    const passwordError = validatePassword(body.password);
    if (passwordError) {
        fields.password = passwordError;
    } else if (
        body.confirmPassword !== undefined &&
        body.confirmPassword !== body.password
    ) {
        fields.confirmPassword = "Passwords do not match.";
    }

    return { values: { name, email, contact, password: body.password }, fields };
};
