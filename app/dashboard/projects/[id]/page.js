"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ArrowLeft } from "lucide-react";
import ChatDashboard from "@/components/chat/ChatDashboard";

export default function ProjectWorkspacePage() {
  const { id } = useParams();
  const { data: session, status } = useSession();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/projects/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setProject(data.project);
      })
      .catch(() => !cancelled && setError("Network error — please try again"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === "loading" || (!project && !error)) {
    return (
      <div className="flex h-dvh items-center justify-center bg-ink text-mist">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-ink px-4 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <Link href="/dashboard/projects" className="flex items-center gap-1.5 text-sm text-mist hover:text-paper">
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
      </div>
    );
  }

  return <ChatDashboard user={session?.user} project={project} />;
}