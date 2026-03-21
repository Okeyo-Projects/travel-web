const encoder = new TextEncoder();

export async function sha256Hex(input: string): Promise<string> {
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacSha256Hex(
    secret: string,
    data: string
): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const sigBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(data)
    );
    const hashArray = Array.from(new Uint8Array(sigBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
