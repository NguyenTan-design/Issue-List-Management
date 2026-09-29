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

        const path =
            url.pathname;


        if (
            path !== "/add-issue" &&
            path !== "/update-issue" &&
            path !== "/delete-issue"
        ) {

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
        // Route
        // ----------------------------------------------------

        if (path === "/update-issue") {

            return handleUpdateIssue(
                body,
                env,
                origin
            );

        }

        if (path === "/delete-issue") {

            return handleDeleteIssue(
                body,
                env,
                origin
            );

        }

        return handleAddIssue(
            body,
            env,
            origin
        );

    }

};


// ============================================================
// HANDLER: ADD ISSUE
// ============================================================

async function handleAddIssue(
    body,
    env,
    origin
) {

    // --------------------------------------------------------
    // Validate record
    // --------------------------------------------------------

    let validation;

    try {

        validation =
            await validateRecord(
                body,
                null
            );

    }

    catch (error) {

        console.error(error);

        return jsonResponse(
            {
                success: false,
                message:
                    error.message ||
                    "Validation failed."
            },
            500,
            origin
        );

    }


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


    // --------------------------------------------------------
    // Add record to GitHub
    // --------------------------------------------------------

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
            error.status || 500,
            origin
        );

    }

}


// ============================================================
// HANDLER: UPDATE ISSUE
//
// Request body:
// {
//   "original": { DATE, SITE, "ISSUE AND REQUEST", STATUS, LOG, "CC LINK" },
//   "updated":  { DATE, SITE, "ISSUE AND REQUEST", STATUS }
// }
//
// The record is located by matching "original".
// LOG and CC LINK of the existing record are preserved.
// ============================================================

async function handleUpdateIssue(
    body,
    env,
    origin
) {

    if (
        !body ||
        typeof body !== "object" ||
        !body.original ||
        typeof body.original !== "object" ||
        !body.updated ||
        typeof body.updated !== "object"
    ) {

        return jsonResponse(
            {
                success: false,
                message:
                    "Request must contain 'original' and 'updated'."
            },
            400,
            origin
        );

    }


    const original =
        body.original;


    // --------------------------------------------------------
    // Validate updated data
    //
    // If SITE or STATUS were not changed by the user, the old
    // value is accepted even if it is no longer in the site
    // list / status list (for example legacy status "NG").
    // --------------------------------------------------------

    let validation;

    try {

        validation =
            await validateRecord(
                body.updated,
                original
            );

    }

    catch (error) {

        console.error(error);

        return jsonResponse(
            {
                success: false,
                message:
                    error.message ||
                    "Validation failed."
            },
            500,
            origin
        );

    }


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


    const updated =
        validation.record;


    // --------------------------------------------------------
    // Update GitHub
    // --------------------------------------------------------

    try {

        const result =
            await updateRecordInGitHub(
                original,
                updated,
                env.GITHUB_TOKEN
            );


        return jsonResponse(
            {
                success: true,
                message:
                    "Issue record updated successfully.",
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
            error.status || 500,
            origin
        );

    }

}


// ============================================================
// HANDLER: DELETE ISSUE
//
// Request body:
// {
//   "record": { DATE, SITE, "ISSUE AND REQUEST", STATUS, LOG, "CC LINK" }
// }
//
// The record to delete is located the same way as for updates:
// by matching all 6 fields against the row the user clicked.
// ============================================================

async function handleDeleteIssue(
    body,
    env,
    origin
) {

    if (
        !body ||
        typeof body !== "object" ||
        !body.record ||
        typeof body.record !== "object"
    ) {

        return jsonResponse(
            {
                success: false,
                message:
                    "Request must contain 'record'."
            },
            400,
            origin
        );

    }


    const record =
        body.record;


    if (
        !String(record.DATE || "").trim() ||
        !String(record.SITE || "").trim()
    ) {

        return jsonResponse(
            {
                success: false,
                message:
                    "'record' must include at least DATE and SITE."
            },
            400,
            origin
        );

    }


    // --------------------------------------------------------
    // Delete from GitHub
    // --------------------------------------------------------

    try {

        const result =
            await deleteRecordFromGitHub(
                record,
                env.GITHUB_TOKEN
            );


        return jsonResponse(
            {
                success: true,
                message:
                    "Issue record deleted successfully.",
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
            error.status || 500,
            origin
        );

    }

}


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
//
// original (optional): the record before editing. When given,
// an unchanged SITE / STATUS is accepted as is.
// ============================================================

async function validateRecord(
    body,
    original
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


    const siteUnchanged =
        !!original &&
        String(
            original.SITE || ""
        ).trim() === site;


    if (!siteUnchanged) {

        const allowedSites =
            await getAllowedSites();


        if (!allowedSites.has(site)) {

            return {

                valid: false,

                message:
                    "Invalid SITE. The selected site is not in the site JSON files (BU4, D7, BU11, VISION, E5, MICRON, LDT)."

            };

        }

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

    const rawStatus =
        String(
            body.STATUS || ""
        ).trim();


    let status =
        normalizeStatus(
            rawStatus
        );


    // Legacy status (for example "NG") that the user did not change

    if (
        !status &&
        original &&
        rawStatus &&
        String(
            original.STATUS || ""
        ).trim() === rawStatus
    ) {

        status = rawStatus;

    }


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
// GENERIC: MODIFY data.json ON GITHUB
//
// mutate(currentData) modifies the array in place and returns
// the value that should be returned to the caller.
//
// Tries twice. The second attempt handles a GitHub 409
// conflict if another user updates data.json at nearly the
// same time (the file is re-read before mutating again).
// ============================================================

async function modifyDataJson(
    token,
    commitMessage,
    mutate
) {

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
        // Apply change (may throw an error with .status)
        // ----------------------------------------------------

        const result =
            mutate(currentData);


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
                        commitMessage,

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

            return result;

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
// ADD RECORD TO GITHUB
// ============================================================

async function addRecordToGitHub(
    record,
    token
) {

    return modifyDataJson(

        token,

        "Add new issue record",

        function(currentData) {

            currentData.push(record);

            return {

                record:
                    record

            };

        }

    );

}


// ============================================================
// UPDATE RECORD IN GITHUB
// ============================================================

async function updateRecordInGitHub(
    original,
    updated,
    token
) {

    return modifyDataJson(

        token,

        "Update issue record",

        function(currentData) {

            const index =
                findRecordIndex(
                    currentData,
                    original
                );


            if (index === -1) {

                const error =
                    new Error(
                        "Record not found. It may have been changed or deleted by someone else — please reload the page."
                    );

                error.status = 404;

                throw error;

            }


            const existing =
                currentData[index];


            // Keep every other field (LOG, CC LINK, ...) as is

            const merged =
                Object.assign(

                    {},

                    existing,

                    {

                        DATE:
                            updated.DATE,

                        SITE:
                            updated.SITE,

                        "ISSUE AND REQUEST":
                            updated["ISSUE AND REQUEST"],

                        STATUS:
                            updated.STATUS

                    }

                );


            currentData[index] =
                merged;


            return {

                record:
                    merged

            };

        }

    );

}


// ============================================================
// DELETE RECORD FROM GITHUB
// ============================================================

async function deleteRecordFromGitHub(
    record,
    token
) {

    return modifyDataJson(

        token,

        "Delete issue record",

        function(currentData) {

            const index =
                findRecordIndex(
                    currentData,
                    record
                );


            if (index === -1) {

                const error =
                    new Error(
                        "Record not found. It may have been changed or deleted by someone else — please reload the page."
                    );

                error.status = 404;

                throw error;

            }


            const removed =
                currentData.splice(
                    index,
                    1
                )[0];


            return {

                record:
                    removed

            };

        }

    );

}


// ============================================================
// FIND RECORD
//
// Matches on DATE, SITE, ISSUE AND REQUEST, STATUS, LOG and
// CC LINK. DATE is compared after converting to MM/DD/YY, so
// it works whichever date format is stored in data.json.
// ============================================================

function normalizeDateForCompare(value) {

    const text =
        String(
            value || ""
        ).trim();


    if (
        /^\d{2}\/\d{2}\/\d{2}$/
            .test(text)
    ) {

        return text;

    }


    const date =
        new Date(text);


    if (isNaN(date.getTime())) {

        return text;

    }


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    const year =
        String(
            date.getFullYear()
        ).slice(-2);


    return `${month}/${day}/${year}`;

}


function sameText(a, b) {

    return (
        String(a || "").trim() ===
        String(b || "").trim()
    );

}


function findRecordIndex(
    data,
    original
) {

    const wantedDate =
        normalizeDateForCompare(
            original.DATE
        );


    return data.findIndex(

        function(item) {

            return (

                item &&

                normalizeDateForCompare(
                    item.DATE
                ) === wantedDate &&

                sameText(
                    item.SITE,
                    original.SITE
                ) &&

                sameText(
                    item["ISSUE AND REQUEST"],
                    original["ISSUE AND REQUEST"]
                ) &&

                sameText(
                    item.STATUS,
                    original.STATUS
                ) &&

                sameText(
                    item.LOG,
                    original.LOG
                ) &&

                sameText(
                    item["CC LINK"],
                    original["CC LINK"]
                )

            );

        }

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
