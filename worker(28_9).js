const OWNER = "NguyenTan-design";

const REPO = "Issue-List-Management";

const BRANCH = "main";

const FILE = "data.json";

const GITHUB_API =
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;

const RAW_BASE =
    `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`;


// ============================================================
// MAIN
// ============================================================

export default {

    async fetch(request, env) {

        const origin =
            request.headers.get("Origin") || "";

        const allowedOrigin =
            (env.ALLOWED_ORIGIN || "").trim();


        // ----------------------------------------------------
        // Check ALLOWED_ORIGIN configuration
        // ----------------------------------------------------

        if (!allowedOrigin) {

            return jsonResponse(
                {
                    success: false,
                    message:
                        "ALLOWED_ORIGIN is not configured."
                },
                500,
                origin
            );

        }


        // ----------------------------------------------------
        // CORS Preflight
        // ----------------------------------------------------

        if (request.method === "OPTIONS") {

            if (!isAllowedOrigin(
                origin,
                allowedOrigin
            )) {

                return new Response(
                    "Forbidden",
                    {
                        status: 403
                    }
                );

            }

            return new Response(
                null,
                {
                    status: 204,
                    headers:
                        corsHeaders(origin)
                }
            );

        }


        // ----------------------------------------------------
        // Check Origin
        // ----------------------------------------------------

        if (!isAllowedOrigin(
            origin,
            allowedOrigin
        )) {

            return jsonResponse(
                {
                    success: false,
                    message:
                        "Origin not allowed."
                },
                403,
                origin
            );

        }


        // ----------------------------------------------------
        // Check URL
        // ----------------------------------------------------

        const url =
            new URL(request.url);


        if (url.pathname !== "/add-issue") {

            return jsonResponse(
                {
                    success: false,
                    message:
                        "Endpoint not found."
                },
                404,
                origin
            );

        }


        // ----------------------------------------------------
        // Check method
        // ----------------------------------------------------

        if (request.method !== "POST") {

            return jsonResponse(
                {
                    success: false,
                    message:
                        "Only POST method is allowed."
                },
                405,
                origin
            );

        }


        // ----------------------------------------------------
        // Check GitHub Token
        // ----------------------------------------------------

        if (!env.GITHUB_TOKEN) {

            return jsonResponse(
                {
                    success: false,
                    message:
                        "GITHUB_TOKEN is not configured."
                },
                500,
                origin
            );

        }


        // ----------------------------------------------------
        // Read request body
        // ----------------------------------------------------

        let body;

        try {

            body =
                await request.json();

        }

        catch (error) {

            return jsonResponse(
                {
                    success: false,
                    message:
                        "Invalid JSON request."
                },
                400,
                origin
            );

        }


        // ----------------------------------------------------
        // Validate record
        // ----------------------------------------------------

        const validation =
            await validateRecord(
                body,
                env.GITHUB_TOKEN
            );


        if (!validation.valid) {

            return jsonResponse(
                {
                    success: false,
                    message:
                        validation.message
                },
                400,
                origin
            );

        }


        const record =
            validation.record;


        // ----------------------------------------------------
        // Add record to GitHub
        // ----------------------------------------------------

        try {

            const result =
                await addRecordToGitHub(
                    record,
                    env.GITHUB_TOKEN
                );


            return jsonResponse(
                {
                    success: true,
                    message:
                        "Issue record added successfully.",
                    record:
                        result.record
                },
                200,
                origin
            );

        }

        catch (error) {

            console.error(error);


            return jsonResponse(
                {
                    success: false,
                    message:
                        error.message ||
                        "Failed to update GitHub."
                },
                500,
                origin
            );

        }

    }

};


// ============================================================
// CORS
// ============================================================

function isAllowedOrigin(
    origin,
    allowedOrigin
) {

    return origin === allowedOrigin;

}


function corsHeaders(origin) {

    return {

        "Access-Control-Allow-Origin":
            origin,

        "Access-Control-Allow-Methods":
            "POST, OPTIONS",

        "Access-Control-Allow-Headers":
            "Content-Type",

        "Access-Control-Max-Age":
            "86400"

    };

}


function jsonResponse(
    data,
    status,
    origin
) {

    const headers = {

        "Content-Type":
            "application/json; charset=UTF-8",

        "Cache-Control":
            "no-store"

    };


    if (origin) {

        headers[
            "Access-Control-Allow-Origin"
        ] = origin;

    }


    return new Response(

        JSON.stringify(data),

        {
            status,
            headers
        }

    );

}


// ============================================================
// VALIDATE RECORD
// ============================================================

async function validateRecord(
    body,
    token
) {

    if (
        !body ||
        typeof body !== "object"
    ) {

        return {

            valid: false,

            message:
                "Invalid request data."

        };

    }


    // --------------------------------------------------------
    // DATE
    // --------------------------------------------------------

    const date =
        String(
            body.DATE || ""
        ).trim();


    if (!isValidDate(date)) {

        return {

            valid: false,

            message:
                "DATE must be a valid date in MM/DD/YY format."

        };

    }


    // --------------------------------------------------------
    // SITE
    // --------------------------------------------------------

    const site =
        String(
            body.SITE || ""
        ).trim();


    if (!site) {

        return {

            valid: false,

            message:
                "SITE is required."

        };

    }


    // --------------------------------------------------------
    // Check SITE against site JSON files
    //
    // BU4.json
    // D7.json
    // BU11.json
    // VISION.json
    // --------------------------------------------------------

    const allowedSites =
        await getAllowedSites();


    if (!allowedSites.has(site)) {

        return {

            valid: false,

            message:
                "Invalid SITE. The selected site is not in BU4.json, D7.json, BU11.json, or VISION.json."

        };

    }


    // --------------------------------------------------------
    // ISSUE AND REQUEST
    // --------------------------------------------------------

    const issue =
        String(
            body["ISSUE AND REQUEST"] || ""
        ).trim();


    if (!issue) {

        return {

            valid: false,

            message:
                "ISSUE AND REQUEST is required."

        };

    }


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    const status =
        normalizeStatus(
            body.STATUS
        );


    if (!status) {

        return {

            valid: false,

            message:
                "STATUS must be Open, Closed, or Monitoring."

        };

    }


    // --------------------------------------------------------
    // Final record
    // --------------------------------------------------------

    return {

        valid: true,

        record: {

            DATE:
                date,

            SITE:
                site,

            "ISSUE AND REQUEST":
                issue,

            STATUS:
                status,

            LOG:
                "",

            "CC LINK":
                ""

        }

    };

}


// ============================================================
// DATE VALIDATION
// ============================================================

function isValidDate(value) {

    const match =
        /^(\d{2})\/(\d{2})\/(\d{2})$/
            .exec(value);


    if (!match) {

        return false;

    }


    const month =
        Number(match[1]);

    const day =
        Number(match[2]);

    const year =
        2000 +
        Number(match[3]);


    if (
        month < 1 ||
        month > 12 ||
        day < 1
    ) {

        return false;

    }


    const date =
        new Date(
            year,
            month - 1,
            day
        );


    return (

        date.getFullYear() === year &&

        date.getMonth() ===
            month - 1 &&

        date.getDate() ===
            day

    );

}


// ============================================================
// STATUS
// ============================================================

function normalizeStatus(value) {

    const status =
        String(
            value || ""
        )
        .trim()
        .toLowerCase();


    const map = {

        "open":
            "Open",

        "closed":
            "Closed",

        "monitoring":
            "Monitoring"

    };


    return map[status] || null;

}


// ============================================================
// GET ALLOWED SITES
// ============================================================

async function getAllowedSites() {

    const files = [

        "BU4.json",

        "D7.json",

        "BU11.json",

        "E5.json",

        "MICRON.json",

        "LDT.json",

        "VISION.json"

    ];


    const responses =
        await Promise.all(

            files.map(

                file =>

                    fetch(

                        `${RAW_BASE}/${file}`,

                        {

                            method:
                                "GET",

                            headers: {

                                "Cache-Control":
                                    "no-cache"

                            }

                        }

                    )

            )

        );


    // --------------------------------------------------------
    // Check all JSON files
    // --------------------------------------------------------

    for (
        const response of responses
    ) {

        if (!response.ok) {

            throw new Error(
                "Unable to read site JSON files."
            );

        }

    }


    // --------------------------------------------------------
    // Convert responses to JSON
    // --------------------------------------------------------

    const jsonData =
        await Promise.all(

            responses.map(

                response =>
                    response.json()

            )

        );


    // --------------------------------------------------------
    // Collect all sites
    // --------------------------------------------------------

    const sites = [];


    for (
        const data of jsonData
    ) {

        if (Array.isArray(data)) {

            for (
                const site of data
            ) {

                if (

                    typeof site ===
                        "string" &&

                    site.trim()

                ) {

                    sites.push(
                        site.trim()
                    );

                }

            }

        }

    }


    return new Set(sites);

}


// ============================================================
// ADD RECORD TO GITHUB
// ============================================================

async function addRecordToGitHub(
    record,
    token
) {

    // --------------------------------------------------------
    // Try twice.
    //
    // Second attempt handles a GitHub 409 conflict if another
    // user updates data.json at nearly the same time.
    // --------------------------------------------------------

    for (
        let attempt = 0;
        attempt < 2;
        attempt++
    ) {


        // ----------------------------------------------------
        // GET current data.json
        // ----------------------------------------------------

        const response =
            await githubRequest(

                "GET",

                `${GITHUB_API}?ref=${encodeURIComponent(BRANCH)}`,

                token

            );


        if (!response.ok) {

            throw new Error(

                await githubErrorMessage(

                    response,

                    "Unable to read data.json."

                )

            );

        }


        const fileData =
            await response.json();


        if (!fileData.content) {

            throw new Error(

                "GitHub did not return data.json content."

            );

        }


        const currentData =
            JSON.parse(

                base64ToUtf8(
                    fileData.content
                )

            );


        if (!Array.isArray(currentData)) {

            throw new Error(

                "data.json must contain a JSON array."

            );

        }


        // ----------------------------------------------------
        // Add new record
        // ----------------------------------------------------

        currentData.push(record);


        // ----------------------------------------------------
        // Convert JSON to formatted UTF-8 Base64
        // ----------------------------------------------------

        const newContent =
            utf8ToBase64(

                JSON.stringify(

                    currentData,

                    null,

                    4

                )

            );


        // ----------------------------------------------------
        // Update GitHub
        // ----------------------------------------------------

        const updateResponse =
            await githubRequest(

                "PUT",

                GITHUB_API,

                token,

                {

                    message:
                        "Add new issue record",

                    content:
                        newContent,

                    sha:
                        fileData.sha,

                    branch:
                        BRANCH

                }

            );


        // ----------------------------------------------------
        // Success
        // ----------------------------------------------------

        if (updateResponse.ok) {

            return {

                record:
                    record

            };

        }


        // ----------------------------------------------------
        // GitHub 409 = file changed since GET
        // Retry once
        // ----------------------------------------------------

        if (

            updateResponse.status === 409 &&

            attempt === 0

        ) {

            continue;

        }


        throw new Error(

            await githubErrorMessage(

                updateResponse,

                "Unable to update data.json."

            )

        );

    }


    throw new Error(

        "Unable to update data.json after retry."

    );

}


// ============================================================
// GITHUB REQUEST
// ============================================================

async function githubRequest(
    method,
    url,
    token,
    body = null
) {

    const options = {

        method,

        headers: {

            "Authorization":
                `Bearer ${token}`,

            "Accept":
                "application/vnd.github+json",

            "X-GitHub-Api-Version":
                "2022-11-28",

            "User-Agent":
                "Issue-List-Backend"

        }

    };


    if (body !== null) {

        options.headers[
            "Content-Type"
        ] =
            "application/json";


        options.body =
            JSON.stringify(body);

    }


    return fetch(
        url,
        options
    );

}


// ============================================================
// GITHUB ERROR
// ============================================================

async function githubErrorMessage(
    response,
    defaultMessage
) {

    try {

        const data =
            await response.json();


        if (data.message) {

            return (

                `${defaultMessage} ` +

                `GitHub: ${data.message}`

            );

        }

    }

    catch (error) {

        // Ignore JSON parsing error

    }


    return (

        `${defaultMessage} ` +

        `HTTP ${response.status}.`

    );

}


// ============================================================
// UTF-8 → BASE64
// ============================================================

function utf8ToBase64(value) {

    const bytes =
        new TextEncoder()
            .encode(value);


    let binary = "";


    const chunkSize =
        0x8000;


    for (

        let i = 0;

        i < bytes.length;

        i += chunkSize

    ) {

        binary +=
            String.fromCharCode(

                ...bytes.subarray(

                    i,

                    i + chunkSize

                )

            );

    }


    return btoa(binary);

}


// ============================================================
// BASE64 → UTF-8
// ============================================================

function base64ToUtf8(value) {

    const binary =
        atob(

            value.replace(
                /\s/g,
                ""
            )

        );


    const bytes =
        Uint8Array.from(

            binary,

            character =>
                character.charCodeAt(0)

        );


    return new TextDecoder()
        .decode(bytes);

}