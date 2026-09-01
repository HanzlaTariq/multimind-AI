import dbConnect from "@/lib/mongodb";
import Flow from "@/models/Flow";
import { getFreshAccessToken, driveListRecentFiles } from "@/lib/googleClient";
import { runFlow } from "@/lib/flowNodes/runFlow";

// Polled by Vercel Cron every 5 minutes (see vercel.json). Vercel is
// serverless, so there's no long-lived process to hold a Drive
// `watch()` push-notification channel open (that needs a publicly
// reachable HTTPS callback plus a renewal job of its own) — polling
// `files.list` on the configured folder is the pattern the rest of this
// app already uses for time-based triggers (see nextRunAt on the Flow
// model for trigger.schedule), just applied to "has a new file shown up"
// instead of "is it time yet".
//
// Auth: Vercel Cron calls this with an `Authorization: Bearer
// $CRON_SECRET` header automatically when CRON_SECRET is set in the
// project's env vars — see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
// Reject anything else so this route can't be hit as an open trigger.
function isAuthorized(req) {
  if (!process.env.CRON_SECRET) return true; // local dev without a secret configured
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// Keep only the most recent N ids per flow — this list only needs to
// answer "have we seen this file before", not be a full audit trail
// (FlowRun already is one). Without a cap, a flow left running for years
// against a busy folder would grow this array forever.
const MAX_TRACKED_FILE_IDS = 500;

export async function GET(req) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const flows = await Flow.find({
    status: "active",
    "nodes.type": "trigger.driveNewFile",
  });

  const results = [];

  for (const flow of flows) {
    const triggerNode = flow.nodes.find((n) => n.type === "trigger.driveNewFile");
    const { connectionId, folderId } = triggerNode?.data?.config || {};
    if (!connectionId || !folderId) {
      results.push({ flowId: String(flow._id), skipped: "not configured yet" });
      continue;
    }

    try {
      const accessToken = await getFreshAccessToken(connectionId, flow.user);
      const files = await driveListRecentFiles({
        accessToken,
        folderId,
        // On the very first poll (lastPolledAt not set yet) fall back to
        // the flow's own createdAt rather than leaving this unset —
        // unset means "list everything ever in the folder", which would
        // replay the whole pre-existing backlog as "new" the moment
        // someone turns the flow on, rather than watching forward from
        // activation like a person would expect.
        sinceIso: (flow.driveSync?.lastPolledAt || flow.createdAt).toISOString(),
      });

      const alreadySeen = new Set(flow.driveSync?.processedFileIds || []);
      const newFiles = files.filter((f) => !alreadySeen.has(f.id));

      let runsStarted = 0;
      for (const file of newFiles) {
        // One run per file, oldest first, so the summary email for file A
        // doesn't arrive out of order relative to file B if both landed
        // in the same polling window.
        const seedOutputs = new Map([
          [
            triggerNode.nodeId,
            { connectionId, fileId: file.id, fileName: file.name, webViewLink: file.webViewLink },
          ],
        ]);
        await runFlow(flow, { userId: flow.user, triggerType: "scheduled", seedOutputs });
        runsStarted += 1;
      }

      const updatedIds = [...alreadySeen, ...newFiles.map((f) => f.id)].slice(-MAX_TRACKED_FILE_IDS);
      flow.driveSync = { processedFileIds: updatedIds, lastPolledAt: new Date() };
      await flow.save();

      results.push({ flowId: String(flow._id), newFiles: newFiles.length, runsStarted });
    } catch (err) {
      // One flow's Drive account being disconnected/expired shouldn't
      // stop every other flow's folder from being checked this tick.
      results.push({ flowId: String(flow._id), error: err.message });
    }
  }

  return Response.json({ checked: flows.length, results });
}
