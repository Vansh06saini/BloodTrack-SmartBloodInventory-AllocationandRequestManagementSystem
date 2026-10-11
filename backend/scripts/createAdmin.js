// Creates a Blood Bank Admin account. This is the ONLY way to create an Admin;
// public sign-up always creates Hospital accounts.
//
//   ADMIN_PASSWORD='S3cretpass' npm run create-admin -- --email admin@bank.org --name "Central Blood Bank" --contact +911234567890
//
// If ADMIN_PASSWORD is not set you will be prompted (input hidden).

import bcrypt from "bcryptjs";
import pool from "../db.js";
import { validateRegistration } from "../utils/authValidation.js";

const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : undefined;
};

const promptHidden = (label) =>
    new Promise((resolve) => {
        process.stdout.write(label);
        const stdin = process.stdin;
        let value = "";
        if (stdin.isTTY) stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding("utf8");
        const onData = (chunk) => {
            for (const ch of chunk) {
                if (ch === "\r" || ch === "\n" || ch === "\u0004") {
                    if (stdin.isTTY) stdin.setRawMode(false);
                    stdin.pause();
                    stdin.off("data", onData);
                    process.stdout.write("\n");
                    return resolve(value);
                }
                if (ch === "\u0003") process.exit(1);
                if (ch === "\u007f") value = value.slice(0, -1);
                else value += ch;
            }
        };
        stdin.on("data", onData);
    });

const main = async () => {
    const password = process.env.ADMIN_PASSWORD || (await promptHidden("Admin password: "));
    const { values, fields } = validateRegistration({
        name: arg("name"),
        email: arg("email"),
        contact: arg("contact"),
        password,
    });

    const firstError = Object.values(fields)[0];
    if (firstError) throw new Error(firstError);

    const [existing] = await pool.query("SELECT user_id FROM users WHERE email = ?", [values.email]);
    if (existing.length > 0) throw new Error(`A user with email ${values.email} already exists.`);

    const hash = await bcrypt.hash(values.password, 12);
    const [result] = await pool.query(
        "INSERT INTO users (Name, email, contact, password, role, created_at) VALUES (?, ?, ?, ?, 'ADMIN', NOW())",
        [values.name, values.email, values.contact, hash]
    );
    console.log(`Admin created: id=${result.insertId} email=${values.email}`);
};

main()
    .catch((err) => {
        console.error("Failed:", err.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
