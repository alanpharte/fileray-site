import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, teamMembersTable, cachedScansTable } from "@workspace/db";
import {
  GetTeamMembersResponse,
  AddTeamMemberBody,
  DeleteTeamMemberParams,
  RunTeamScanResponse,
  GetCachedTeamScanResponse,
} from "@workspace/api-zod";
import * as drive from "../lib/googleDrive";
import { DriveApiError } from "../lib/googleDrive";

const router: IRouter = Router();

router.get("/team-members", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  try {
    const members = await db
      .select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.userId, userId))
      .orderBy(teamMembersTable.addedAt);
    res.json(GetTeamMembersResponse.parse(members));
  } catch (err) {
    req.log.error({ err }, "Error fetching team members");
    res.status(500).json({ error: "Failed to load team members." });
  }
});

router.post("/team-members", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const parsed = AddTeamMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [member] = await db.insert(teamMembersTable).values({
      userId,
      email: parsed.data.email,
      name: parsed.data.name || null,
    }).returning();

    res.status(201).json({
      id: member.id,
      email: member.email,
      name: member.name,
      addedAt: member.addedAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "This email is already a team member." });
      return;
    }
    throw err;
  }
});

router.delete("/team-members/:id", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const params = DeleteTeamMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(teamMembersTable)
    .where(and(eq(teamMembersTable.id, params.data.id), eq(teamMembersTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Team member not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/team/scan", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  try {
    const members = await db
      .select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.userId, userId));

    if (members.length === 0) {
      res.json(RunTeamScanResponse.parse({
        scannedAt: new Date().toISOString(),
        staleAccessAlerts: [],
        oversharingAlerts: [],
        accessMatrix: [],
      }));
      return;
    }

    const memberEmails = members.map(m => m.email.toLowerCase());

    const filesData = await drive.searchFiles({ pageSize: 200 });
    const files = filesData.files;

    const staleAccessAlerts: any[] = [];
    const oversharingAlerts: any[] = [];

    for (const file of files) {
      try {
        const perms = await drive.getFilePermissions(file.id);

        for (const person of perms.people) {
          if (person.emailAddress && memberEmails.includes(person.emailAddress.toLowerCase())) {
            const modDate = new Date(file.modifiedTime);
            const daysSinceModified = Math.floor((Date.now() - modDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceModified > 90 && (person.role === "writer" || person.role === "owner")) {
              staleAccessAlerts.push({
                fileId: file.id,
                fileName: file.name,
                personEmail: person.emailAddress,
                personName: person.displayName,
                permissionLevel: person.role,
                lastActivityDate: file.modifiedTime,
              });
            }
          }
        }

        if (perms.linkSharing.enabled) {
          let severity: "high" | "medium" | "low" = "low";
          let sharingLevel: "edit" | "comment" | "view" = "view";

          if (perms.linkSharing.role === "writer") {
            severity = "high";
            sharingLevel = "edit";
          } else if (perms.linkSharing.role === "commenter") {
            severity = "medium";
            sharingLevel = "comment";
          }

          oversharingAlerts.push({
            fileId: file.id,
            fileName: file.name,
            sharingLevel,
            severity,
            owner: file.owners?.[0]?.displayName || "Unknown",
            lastModified: file.modifiedTime,
          });
        }
      } catch {
        continue;
      }
    }

    const topFolders = await drive.searchFiles({ fileType: "folder", pageSize: 10 });
    const accessMatrix = members.map(member => ({
      memberEmail: member.email,
      memberName: member.name || null,
      accessEntries: topFolders.files.map((folder: any) => ({
        folderId: folder.id,
        folderName: folder.name,
        role: null as string | null,
      })),
    }));

    const scanResult = {
      scannedAt: new Date().toISOString(),
      staleAccessAlerts,
      oversharingAlerts,
      accessMatrix,
    };

    await db.insert(cachedScansTable).values({
      userId,
      scanType: "team_scan",
      data: scanResult,
    });

    res.json(RunTeamScanResponse.parse(scanResult));
  } catch (err) {
    if (err instanceof DriveApiError) {
      req.log.error({ err }, "Drive API error during team scan");
      res.status(err.status).json({ error: "Could not complete team scan. Google Drive returned an error." });
      return;
    }
    req.log.error({ err }, "Error during team scan");
    res.status(500).json({ error: "Team scan failed. Please try again." });
  }
});

router.get("/team/scan/cached", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  try {
    const [cached] = await db.select()
      .from(cachedScansTable)
      .where(and(eq(cachedScansTable.userId, userId), eq(cachedScansTable.scanType, "team_scan")))
      .orderBy(desc(cachedScansTable.scannedAt))
      .limit(1);

    if (!cached) {
      res.json(GetCachedTeamScanResponse.parse({
        scannedAt: null,
        staleAccessAlerts: [],
        oversharingAlerts: [],
        accessMatrix: [],
      }));
      return;
    }

    res.json(GetCachedTeamScanResponse.parse(cached.data));
  } catch (err) {
    req.log.error({ err }, "Error fetching cached team scan");
    res.status(500).json({ error: "Failed to load cached scan data." });
  }
});

export default router;
