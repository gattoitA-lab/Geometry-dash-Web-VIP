/*
 * Import .gmd (XML plist) and .gdlvl (gzip + Base64 XML) level files.
 * The parser extracts the playable level string from k4 and normalizes it
 * to the plain format used by Web Dashers' parseLevel().
 */
(function (global) {
    "use strict";

    var BOM = /^\uFEFF/;

    function bytesFromBase64(value) {
        var clean = String(value || "")
            .replace(/\s+/g, "")
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .replace(/=+$/, "");
        if (!clean || !/^[A-Za-z0-9+/]+$/.test(clean)) return null;
        try {
            var binary = atob(clean);
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes;
        } catch (err) {
            return null;
        }
    }

    function inflateBytes(bytes) {
        if (!bytes || !bytes.length) return "";
        try {
            if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
                return pako.ungzip(bytes, { to: "string" });
            }
            return pako.inflate(bytes, { to: "string" });
        } catch (err) {
            return "";
        }
    }

    function decodeText(bytes) {
        try {
            return new TextDecoder("utf-8").decode(bytes);
        } catch (err) {
            return "";
        }
    }

    function looksLikeLevelString(value) {
        var text = String(value || "").trim();
        return /^k[A-Za-z0-9]+\s*,/.test(text) && text.indexOf(";") >= 0;
    }

    function normalizeLevelString(value) {
        var text = String(value == null ? "" : value).replace(BOM, "").trim();
        if (!text) return "";
        if (looksLikeLevelString(text)) return text;
        if (text.charAt(0) === "<" || text.charAt(0) === "{") return text;

        var bytes = bytesFromBase64(text);
        if (!bytes) return text;

        var inflated = inflateBytes(bytes);
        if (looksLikeLevelString(inflated)) return inflated;

        var decoded = decodeText(bytes).replace(BOM, "").trim();
        if (looksLikeLevelString(decoded)) return decoded;
        return text;
    }

    function decodeWholeFile(text) {
        text = String(text || "").replace(BOM, "").trim();
        if (!text || text.charAt(0) === "<" || text.charAt(0) === "{") return text;

        var bytes = bytesFromBase64(text);
        if (!bytes) return text;

        var inflated = inflateBytes(bytes);
        if (inflated) return inflated.replace(BOM, "").trim();

        return decodeText(bytes).replace(BOM, "").trim() || text;
    }

    function decodeDescription(value) {
        var text = String(value || "");
        if (!text) return "";
        var bytes = bytesFromBase64(text);
        if (!bytes) return text;
        return decodeText(bytes) || text;
    }

    function readXmlLevel(text, fileName) {
        var doc = new DOMParser().parseFromString(text, "text/xml");
        if (doc.querySelector("parsererror")) {
            throw new Error("Invalid XML level file.");
        }

        var values = {};
        doc.querySelectorAll("key, k").forEach(function (keyNode) {
            var valueNode = keyNode.nextElementSibling;
            if (!valueNode) return;
            values[keyNode.textContent.trim()] = valueNode.textContent;
        });

        if (!values.k4) throw new Error("No level string found (k4).");

        return {
            name: values.k2 || fileName || "Imported Level",
            data: normalizeLevelString(values.k4),
            version: parseInt(values.k16, 10) || 1,
            length: parseInt(values.k23 || values.k18, 10) || 0,
            id: values.k1 || "NA",
            desc: decodeDescription(values.k3),
            officialSongId: parseInt(values.k8, 10) || 0,
            customSongId: parseInt(values.k45, 10) || 0
        };
    }

    function readJsonLevel(text, fileName) {
        var parsed = JSON.parse(text);
        var info = parsed.level && typeof parsed.level === "object" ? parsed.level : parsed;
        var data = parsed.data && typeof parsed.data === "string"
            ? parsed.data
            : info.data && typeof info.data === "string"
                ? info.data
                : info.levelString;

        if (!data && parsed.data && typeof parsed.data === "object") {
            if (Array.isArray(parsed.data.objects) && global.__gdEncodeLevel) {
                data = global.__gdEncodeLevel(parsed.data);
            }
        }
        if (!data) throw new Error("No level string found in JSON.");

        return {
            name: parsed.name || info.name || fileName || "Imported Level",
            data: normalizeLevelString(data),
            version: parseInt(parsed.version || info.version, 10) || 1,
            length: parseInt(parsed.length || info.length, 10) || 0,
            id: parsed.id || info.id || "NA",
            desc: parsed.desc || parsed.description || info.desc || info.description || "",
            officialSongId: parseInt(parsed.officialSongId || info.officialSongId, 10) || 0,
            customSongId: parseInt(parsed.customSongId || info.customSongId, 10) || 0
        };
    }

    function parseText(rawText, fileName) {
        var text = decodeWholeFile(rawText);
        if (!text) throw new Error("The level file is empty.");

        if (text.charAt(0) === "<") return readXmlLevel(text, fileName);
        if (text.charAt(0) === "{") return readJsonLevel(text, fileName);

        var normalized = normalizeLevelString(text);
        if (!looksLikeLevelString(normalized)) {
            throw new Error("Unrecognized level format.");
        }
        return {
            name: fileName || "Imported Level",
            data: normalized,
            version: 1,
            length: 0,
            id: "NA",
            desc: "",
            officialSongId: 0,
            customSongId: 0
        };
    }

    function readFile(file) {
        return new Promise(function (resolve, reject) {
            if (!file) {
                reject(new Error("No file selected."));
                return;
            }
            var fileName = String(file.name || "Imported Level").replace(/\.[^.]+$/, "");
            var finish = function (buffer) {
                try {
                    var bytes = new Uint8Array(buffer);
                    var text = "";
                    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
                        text = inflateBytes(bytes);
                    } else {
                        text = decodeText(bytes).replace(BOM, "").trim();
                    }
                    resolve(parseText(text, fileName));
                } catch (err) {
                    reject(err);
                }
            };

            if (typeof file.arrayBuffer === "function") {
                file.arrayBuffer().then(finish, reject);
                return;
            }

            var reader = new FileReader();
            reader.onload = function (event) { finish(event.target.result); };
            reader.onerror = function () { reject(new Error("Unable to read the file.")); };
            reader.readAsArrayBuffer(file);
        });
    }

    global.GDLevelImport = {
        parseFile: readFile,
        parseText: parseText,
        normalizeLevelString: normalizeLevelString
    };
})(typeof window !== "undefined" ? window : globalThis);
