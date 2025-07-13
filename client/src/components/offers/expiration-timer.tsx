import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

function parseDate(str: string) {
  if (!str) return new Date(0);
  return new Date(/Z$|[+-]\d{2}:\d{2}$/.test(str) ? str : str + "Z");
}

export default function ExpirationTimer({ expiresAt }: { expiresAt: string }) {
  const [time, setTime] = useState("0m");

  useEffect(() => {
    function update() {
      const diff = parseDate(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTime("0m");
        return;
      }
      const h = Math.floor(diff / 1000 / 60 / 60);
      const m = Math.floor((diff / 1000 / 60) % 60);
      setTime(`${h}h ${m}m`);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <p className="text-red-600 text-sm flex items-center">
      <Clock className="w-4 h-4 mr-1" />
      {time} left
    </p>
  );
}
