// Thin wrapper around the CloudConvert v2 API for document conversions
// (Word/PDF/PowerPoint) that we can't reliably do ourselves without a full
// office-rendering engine. Requires CLOUDCONVERT_API_KEY in the environment
// — sign up at https://cloudconvert.com, create an API key under
// Dashboard > API Keys, and paste it into your env vars.
//
// NOTE: CloudConvert's exact field names/response shape can change between
// API versions — if this starts failing, check https://cloudconvert.com/api/v2
// for the current job/task schema.

const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY;
const BASE_URL = "https://api.cloudconvert.com/v2";

async function ccFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `CloudConvert request failed (${res.status})`);
  }
  return data;
}

export async function convertFile({ fileBuffer, filename, inputFormat, outputFormat }) {
  if (!CLOUDCONVERT_API_KEY) {
    throw new Error(
      "Document conversion isn't configured yet — CLOUDCONVERT_API_KEY is missing on the server."
    );
  }

  // 1. Create a job: upload -> convert -> export as a downloadable URL
  const job = await ccFetch("/jobs", {
    method: "POST",
    body: JSON.stringify({
      tasks: {
        "import-file": { operation: "import/upload" },
        "convert-file": {
          operation: "convert",
          input: "import-file",
          input_format: inputFormat,
          output_format: outputFormat,
        },
        "export-file": {
          operation: "export/url",
          input: "convert-file",
        },
      },
    }),
  });

  const importTask = job.data.tasks.find((t) => t.name === "import-file");
  const { url: uploadUrl, parameters: uploadParams } = importTask.result.form;

  // 2. Upload the file as multipart form data to the URL CloudConvert gave us
  const form = new FormData();
  Object.entries(uploadParams).forEach(([key, value]) => form.append(key, value));
  form.append("file", new Blob([fileBuffer]), filename);

  const uploadRes = await fetch(uploadUrl, { method: "POST", body: form });
  if (!uploadRes.ok) {
    throw new Error("Failed to upload the file to CloudConvert.");
  }

  // 3. Poll until the job finishes — capped so we don't run past a serverless
  // function's execution time limit. If your plan's timeout is shorter than
  // this, large/complex files may fail with a timeout error below.
  const jobId = job.data.id;
  const deadline = Date.now() + 50000;
  let finishedJob = null;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const statusRes = await ccFetch(`/jobs/${jobId}`);
    const status = statusRes.data.status;

    if (status === "finished") {
      finishedJob = statusRes.data;
      break;
    }
    if (status === "error") {
      const failedTask = statusRes.data.tasks.find((t) => t.status === "error");
      throw new Error(failedTask?.message || "Conversion failed on CloudConvert.");
    }
  }

  if (!finishedJob) {
    throw new Error("This conversion is taking longer than expected — please try a smaller file.");
  }

  const exportTask = finishedJob.tasks.find((t) => t.name === "export-file");
  const file = exportTask.result.files[0];

  return { downloadUrl: file.url, filename: file.filename };
}