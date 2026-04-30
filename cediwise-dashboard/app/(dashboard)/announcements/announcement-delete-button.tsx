"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteAnnouncementCampaign } from "@/lib/actions/announcements";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  campaignId: string;
  title: string;
};

export function AnnouncementDeleteButton({ campaignId, title }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteAnnouncementCampaign(campaignId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not delete campaign");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
            Delete
          </Button>
        }
      />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block font-medium text-foreground">{title}</span>
            This removes the campaign from the dashboard and from users&apos; in-app Updates inbox. Delivery
            logs for this send are removed. This cannot be undone.
          </AlertDialogDescription>
          {error ? <p className="text-destructive text-sm pt-2">{error}</p> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={loading} onClick={() => void handleDelete()}>
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
