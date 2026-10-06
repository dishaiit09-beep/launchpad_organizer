import { useEffect, useState } from "react";
import { reminderDays, type Item } from "./lib/records";
export function DeadlineReminders({
  items,
  zone,
  account,
  onOpen,
}: {
  items: Item[];
  zone: string;
  account: string;
  onOpen: (id: string) => void;
}) {
  const [now, setNow] = useState(new Date());
  const [permission, setPermission] = useState(
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission,
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const reminders = items.flatMap((item) => {
    const days = reminderDays(item, now, zone);
    return days === null ? [] : [{ item, days }];
  });
  useEffect(() => {
    if (permission !== "granted") return;
    for (const { item, days } of reminders) {
      const key = `launchpad-reminder:${account}:${item.id}:${item.data.deadline}:${days}`;
      try {
        if (localStorage.getItem(key)) continue;
        new Notification(`Deadline in ${days} day${days === 1 ? "" : "s"}`, {
          body: item.data.title,
          tag: key,
        });
        localStorage.setItem(key, "sent");
      } catch {
        /* In-app reminders remain available on browsers without notifications. */
      }
    }
  }, [items, now, permission, account, zone]);
  return (
    <details className="panel deadline-reminders" open={reminders.length > 0}>
      <summary>
        🔔 Deadline reminders · {reminders.length} due in 3 or 1 days
      </summary>
      <p>
        Reminders appear here automatically. Browser notifications work while
        this app is open.
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
      {reminders.map(({ item, days }) => (
        <button
          className="reminder-entry"
          key={item.id}
          onClick={() => onOpen(item.id)}
        >
          {item.data.title} · {days} day{days === 1 ? "" : "s"} left
        </button>
      ))}
      {!reminders.length && <p>No deadlines 3 or 1 days away today.</p>}
    </details>
  );
}
