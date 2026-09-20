const GITHUB_OWNER = "safkatms";
const GITHUB_REPO = "finance-expo";
const CURRENT_VERSION = "1.5.0";
const APP_STORE_URL = "https://safkatms.github.io/app-store-site/";

export interface GitHubRelease {
    tag_name: string;
    name: string;
    body: string;
    html_url: string;
    published_at: string;
    assets: { name: string; browser_download_url: string }[];
}

export interface UpdateInfo {
    hasUpdate: boolean;
    latestVersion: string;
    currentVersion: string;
    releaseNotes: string;
    releaseUrl: string;
    apkUrl: string | null;
    publishedAt: string;
}

function stripV(tag: string) {
    return tag.replace(/^v/, "");
}

function isNewer(latest: string, current: string): boolean {
    const a = latest.split(".").map(Number);
    const b = current.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
        if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
        if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
    }
    return false;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
    const res = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
        { headers: { Accept: "application/vnd.github+json" } },
    );

    if (!res.ok) throw new Error("Failed to fetch release info");

    const release: GitHubRelease = await res.json();
    const latestVersion = stripV(release.tag_name);

    const apkAsset = release.assets.find((a) =>
        a.name.toLowerCase().endsWith(".apk"),
    );

    return {
        hasUpdate: isNewer(latestVersion, CURRENT_VERSION),
        latestVersion,
        currentVersion: CURRENT_VERSION,
        releaseNotes: release.body ?? "",
        releaseUrl: APP_STORE_URL,
        apkUrl: apkAsset?.browser_download_url ?? null,
        publishedAt: release.published_at,
    };
}