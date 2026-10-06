import { useEffect, useRef, useState } from "react";
import { reminderDays, taskReminderDue, type Item } from "./lib/records";
export function DeadlineReminders({
  items,
  zone,
  account,
  onOpen,
  onDismiss,
  pending,
}: {
  items: Item[];
  zone: string;
  account: string;
  onOpen: (id: string) => void;
  onDismiss: (item: Item) => Promise<void>;
  pending: Set<string>;
}) {
  const [now, setNow] = useState(new Date());
  const notifying = useRef(new Set<string>());
  const sent = useRef(new Set<string>());
  const [permission, setPermission] = useState(
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission,
  );
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const reminders = items.flatMap((item) => {
    const days = reminderDays(item, now, zone);
    const entries: {
      item: Item;
      key: string;
      title: string;
      label: string;
      custom: boolean;
    }[] = [];
    if (days !== null)
      entries.push({
        item,
        key: `${item.id}:${item.data.deadline}:${days}`,
        title: `Deadline in ${days} day${days === 1 ? "" : "s"}`,
        label: `${days} day${days === 1 ? "" : "s"} left`,
        custom: false,
      });
    if (taskReminderDue(item, now))
      entries.push({
        item,
        key: `time:${item.id}:${item.data.reminderAt}`,
        title: "Task reminder",
        label: `Reminder · ${new Intl.DateTimeFormat("en-IN", { timeZone: item.data.timezone || zone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(item.data.reminderAt!))}`,
        custom: true,
      });
    return entries;
  });
  useEffect(() => {
    if (permission !== "granted") return;
    for (const reminder of reminders) {
      const key = `launchpad-reminder:${account}:${reminder.key}`;
      if (notifying.current.has(key) || sent.current.has(key)) continue;
      notifying.current.add(key);
      void (async () => {
        try {
          try {
            if (localStorage.getItem(key)) {
              sent.current.add(key);
              return;
            }
          } catch {}
          const options = { body: reminder.item.data.title, tag: key };
          const registration =
            "serviceWorker" in navigator
              ? await navigator.serviceWorker.getRegistration()
              : undefined;
          if (registration?.showNotification)
            await registration.showNotification(reminder.title, options);
          else new Notification(reminder.title, options);
          sent.current.add(key);
          try {
            localStorage.setItem(key, "sent");
          } catch {}
        } catch {
          /* In-app reminders are still available when browser notifications fail. */
        } finally {
          notifying.current.delete(key);
        }
      })();
    }
  }, [items, now, permission, account, zone]);
  return (
    <details className="panel deadline-reminders" open={reminders.length > 0}>
      <summary>🔔 Reminders · {reminders.length} ready</summary>
      <p>
        Your selected task times and default 3-day / 1-day deadline reminders
        appear here. Browser notifications need permission and an open app.
        Missed task reminders stay here until dismissed or completed.
      </p>
      {permission === "default" && (
        <button
          onClick={() =>
            void Notification.requestPermission().then(setPermission)
          }
        >
          Enable browser notifications
        </button>
      )}
      {permission === "denied" && (
        <p>Browser notifications are blocked; reminders still appear here.</p>
      )}
      {reminders.map((reminder) => (
        <div className="reminder-row" key={reminder.key}>
          <button
            className="reminder-entry"
            onClick={() => onOpen(reminder.item.id)}
          >
            {reminder.item.data.title} · {reminder.label}
          </button>
          {reminder.custom && (
            <button
              className="reminder-dismiss"
              disabled={pending.has(reminder.item.id)}
              onClick={() => void onDismiss(reminder.item)}
              aria-label={`Dismiss reminder for ${reminder.item.data.title}`}
            >
              Dismiss
            </button>
          )}
        </div>
      ))}
      {!reminders.length && <p>No reminders due right now.</p>}
    </details>
  );
}
