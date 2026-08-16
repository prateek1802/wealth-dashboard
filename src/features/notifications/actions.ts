"use server";
import { notificationsService } from "@/lib/services/notifications.service";

export async function getUpcomingRemindersAction() {
  return notificationsService.getUpcomingReminders();
}
