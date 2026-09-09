type Arguments = {
  label: string;
  url: string;
  id?: string;
};

function readArguments(argv: string[]): Arguments {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith("--")) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) continue;
    values.set(key.slice(2), value);
    index += 1;
  }

  const label = values.get("label")?.trim() ?? "";
  const url = values.get("url")?.trim() ?? "";
  if (!label || !url) {
    throw new Error("Usage: pnpm buy-via:add --label \"Contact name\" --url \"https://...\" [--id \"contact-id\"]");
  }

  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("The contact URL must use http or https.");
  }

  return { label, url: parsedUrl.toString(), id: values.get("id")?.trim() || undefined };
}

async function main() {
  const input = readArguments(process.argv.slice(2));
  const apiBase = (process.env.APPORY_API_BASE_URL ?? "http://localhost:80/api").replace(/\/+$/, "");
  const ownerCode = process.env.APPORY_BUY_VIA_OWNER_CODE ?? "151683";
  const response = await fetch(`${apiBase}/buy-via-contacts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-appory-buy-via-owner-code": ownerCode,
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => null) as { id?: string; label?: string; message?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.message ?? `The server rejected the contact (HTTP ${response.status}).`);
  }

  console.log(`Buy via contact added: ${payload?.label ?? input.label}`);
  console.log("It is saved in shared storage and will appear on every phone after refresh.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Could not add the Buy via contact.");
  process.exitCode = 1;
});